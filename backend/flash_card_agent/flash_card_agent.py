from dotenv import load_dotenv
load_dotenv()

import os
import re
from typing import List, TypedDict

from fastapi import FastAPI, UploadFile
from fastapi.responses import JSONResponse

from langchain import hub
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langgraph.graph import START, StateGraph

from langchain_community.document_loaders import PyPDFLoader
from langchain.prompts import ChatPromptTemplate
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI

from llm_config import llm  

app = FastAPI()

embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
vector_store = InMemoryVectorStore(embeddings)

prompt = ChatPromptTemplate.from_template(
    """You are an expert tutor. Carefully analyze the following document and extract the 10 most important flashcards to help a student study the material. Focus on key concepts and terminology.

Generate a single JSON object only with three keys:
- "name": A short, descriptive stack name (maximum 4 words), based on the document content.
- "description": A brief descriptive stack blurb (maximum 20 words), based on the document content.
- "qasets": An array of 10 flashcards, each containing a "question" and an "answer".

Each flashcard must be formatted like:
{{
  "question": "...",
  "answer": "..."
}}

Respond with a single valid JSON object only — without any extra text, explanation, or markdown formatting.
Do NOT wrap the response in triple backticks (```), or use ```json or ```python.

Context: {context}
"""
)

class State(TypedDict):
    question: str
    context: List[Document]
    answer: dict 

def retrieve(state: State):
    retrieved_docs = vector_store.similarity_search(state["question"])
    return {"context": retrieved_docs}

def generate(state: State):
    docs_content = "\n\n".join(doc.page_content for doc in state["context"])
    messages = prompt.invoke({"question": state["question"], "context": docs_content})
    response = llm.invoke(messages)
    parsed = response.content
    return {"answer": parsed} 

graph_builder = StateGraph(State).add_sequence([retrieve, generate])
graph_builder.add_edge(START, "retrieve")
graph = graph_builder.compile()

async def ingest_uploaded_file(file: UploadFile):
    file_path = f"./{file.filename}"
    with open(file_path, "wb") as f:
        f.write(await file.read())

    loader = PyPDFLoader(file_path)
    pages = loader.load()

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    splits = text_splitter.split_documents(pages)

    vector_store.add_documents(splits)
    os.remove(file_path)

    return f"Loaded {len(splits)} document chunks from {file.filename}"

