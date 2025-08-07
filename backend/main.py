import os
import fitz
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, UploadFile, File, Form, Body
from typing import List
from fastapi.middleware.cors import CORSMiddleware
import requests
from datetime import datetime, timedelta
from calendar_agent.calendar_agent import agent
from upload_agent.upload_agent import ingest_uploaded_file, graph
from flash_card_agent.flash_card_agent import ingest_uploaded_file, graph
from fastapi.responses import JSONResponse
from fastapi import FastAPI, Request, Depends, Query, HTTPException
from sqlalchemy.orm import Session,  relationship
import models, schemas
from db import get_db, engine
import json
import re
from queryClasses import AskRequest

app = FastAPI()

models.Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")

def extract_text_from_pdf(file_bytes: bytes) -> str:
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        text = ""
        for page in doc:
            text += page.get_text()
    return text

@app.post("/chat")
async def chat_with_gemini(file: UploadFile = File(...), action: str = Form(...)):
    file_bytes = await file.read()

    if file.content_type == "application/pdf":
        text_from_file = extract_text_from_pdf(file_bytes)
    else:
        text_from_file = file_bytes.decode("utf-8", errors="ignore")

    actionText = "" 

    if action == "summarize-paragraph": 
        actionText = "Summarize the text as a paragraph." 
    elif action == "summarize-bullets": 
        actionText = "Summarize major points of the text. Style each paragraph as a bullet like • ."
    elif action == "list-concepts": 
        actionText = "List major terms and provide definitions for each term from the text."
    else: 
        actionText = "Write 10 quiz questions based on the text provided. Write answers underneath the question block. The questions and the answers must be numbered like QUESTIONS Q1:  and ANSWERS A1:  "

    full_prompt = f"{text_from_file}\n\nUser Question: {actionText}"
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": full_prompt}
                ]
            }
        ]
    }

    try:
        response = requests.post(
            f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
            headers={"Content-Type": "application/json"},
            json=payload
        )
        if response.status_code == 429: 
            return {"response": "Too many requests. Please retry in 60 minutes."}
        response.raise_for_status()
        
        data = response.json()
        output = data["candidates"][0]["content"]["parts"][0]["text"]
        return {"response": output}
    except Exception as e:
        return {"error": str(e)}

@app.post("/calendar")
async def calender_agent(question: str = Body(..., embed=True)): 

    timezone="America/New_York"
    current_date=datetime.now()

    prompt = f"Question: {question}. Additional information: timezone: {timezone}, the current date: {current_date}."
    
    try:
        result = agent.invoke(prompt)
        return {"response": result}
    except Exception as e:
        print("Error:", e)
        return {"error": str(e)}


@app.post("/upload")
async def upload_agent(files: List[UploadFile] = File(...)):
    results = []
    for file in files:
        message = await ingest_uploaded_file(file)
        results.append(message)
    return {"status": "success", "message": results}


@app.post("/upload/ask")
async def ask_upload_question(data: AskRequest):
    response = graph.invoke({"question": data.question})
    return {"answer": response["answer"]}


@app.post("/create-flash-cards")
async def upload(file: UploadFile, db: Session = Depends(get_db)):
    await ingest_uploaded_file(file)
    
    output = graph.invoke({
        "question": "What do I need to know for the test?"
    })

    def clean_json_string(s: str) -> str:
        return re.sub(r"^```(?:json|python)?\s*|\s*```$", "", s.strip())


    raw_data = output["answer"]
    cleaned = clean_json_string(raw_data)

    if isinstance(raw_data, str):
        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Answer is not valid JSON")
    else:
        data = raw_data

    qa_objects = [
        models.QAset(question=qa["question"], answer=qa["answer"])
        for qa in data["qasets"]
    ]

    new_stack = models.Stack(
        name=data.get("name", "New Stack"),
        description=data.get("description", ""),
        qasets=qa_objects
    )

    db.add(new_stack)
    db.commit()
    db.refresh(new_stack)

    return JSONResponse(content=output["answer"])

@app.get("/get-flash-cards", response_model=List[schemas.StackSchema])
def get_flash_cards(db: Session = Depends(get_db)):
    return db.query(models.Stack).all()

@app.patch("/edit-flash-cards", response_model=List[schemas.StackSchema])
def edit_flash_cards(
    updated_stack: schemas.StackSchema,  
    db: Session = Depends(get_db)
):
    
    stack = db.query(models.Stack).filter(models.Stack.id == updated_stack.id).first()
    if not stack:
        raise HTTPException(status_code=404, detail="Stack not found")

    stack.name = updated_stack.name
    stack.description = updated_stack.description

    for qa_data in updated_stack.qasets:
        qa_entry = db.query(models.QAset).filter(
            models.QAset.id == qa_data.id,
            models.QAset.stack_id == stack.id
        ).first()

        if qa_entry:
            qa_entry.question = qa_data.question
            qa_entry.answer = qa_data.answer
        else:
            new_qa = models.QAset(
                question=qa_data.question,
                answer=qa_data.answer,
                stack_id=stack.id
            )
            db.add(new_qa)

    db.flush()
    db.commit()

    return db.query(models.Stack).all()


@app.get("/get-flash-cards/{id}", response_model=schemas.StackSchema)
def get_stack(id: int, db: Session = Depends(get_db)):
    stack = db.query(models.Stack).filter(models.Stack.id == id).first()
    if not stack:
        raise HTTPException(status_code=404, detail="Stack not found")
    return stack


@app.delete("/delete-flash-cards/{id}")
def get_stack(id: int, db: Session = Depends(get_db)):
    stack = db.query(models.Stack).filter(models.Stack.id == id).first()
    if not stack:
        raise HTTPException(status_code=404, detail="Stack not found")
    db.delete(stack)
    db.commit()
    return JSONResponse(content={"detail": f"Stack {id} deleted successfully"})