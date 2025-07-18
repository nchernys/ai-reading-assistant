import os
import fitz
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, UploadFile, File, Form
from typing import List
from fastapi.middleware.cors import CORSMiddleware
import requests
from datetime import datetime, timedelta
from fastapi import Body
from calendar_agent.calendar_agent import agent
from upload_agent.upload_agent import ingest_uploaded_file, graph
from queryClasses import AskRequest

app = FastAPI()


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
        print("HIT PDF")
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

    print(full_prompt)
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": full_prompt}
                ]
            }
        ]
    }

    print("payload")

    try:
        response = requests.post(
            f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
            headers={"Content-Type": "application/json"},
            json=payload
        )
        if response.status_code == 429: 
            return {"response": "Too many requests. Please retry in 60 minutes."}
        print(response, "RESPONSE")
        response.raise_for_status()
        
        data = response.json()
        output = data["candidates"][0]["content"]["parts"][0]["text"]
        print(output)
        return {"response": output}
    except Exception as e:
        return {"error": str(e)}



@app.post("/calendar")
async def calender_agent(question: str = Body(..., embed=True)): 

    timezone="America/New_York"
    current_date=datetime.now()

    prompt = f"Question: {question}. Additional information: timezone: {timezone}, the current date: {current_date}."
    
    try:
        # Let the agent process the user question and invoke the appropriate tool
        result = agent.invoke(prompt)
        return {"response": result}
    except Exception as e:
        print("Error:", e)
        return {"error": str(e)}


@app.post("/upload")
async def upload_agent(files: List[UploadFile] = File(...)):
    print("HIT UPLOAD")

    results = []
    for file in files:
        message = await ingest_uploaded_file(file)
        results.append(message)
    return {"status": "success", "message": results}


@app.post("/upload/ask")
async def ask_upload_question(data: AskRequest):
    response = graph.invoke({"question": data.question})
    return {"answer": response["answer"]}