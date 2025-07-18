from dotenv import load_dotenv
load_dotenv()
import os
from llm_config import llm
from langchain import hub
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langgraph.graph import START, StateGraph
from typing_extensions import List, TypedDict
from fastapi import UploadFile
from langchain_community.document_loaders import PyPDFLoader
from langchain.prompts import ChatPromptTemplate

from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

vector_store = InMemoryVectorStore(embeddings)
prompt = hub.pull("rlm/rag-prompt")

class State(TypedDict):
    question: str
    context: List[Document]
    answer: str

def retrieve(state: State):
    retrieved_docs = vector_store.similarity_search(state["question"])
    return {"context": retrieved_docs}

prompt = ChatPromptTemplate.from_template(
    """You are a helpful expert assistant. You give well-organized exhaustive responses.
Use the following context to answer the user's question **exactly as instructed**, including word counts or formatting requests. Format with bullet points whenever possible. Use bold font for highlighting.
Context: {context}
Question: {question}
Answer:"""
)

def generate(state: State):
    docs_content = "\n\n".join(doc.page_content for doc in state["context"])
    messages = prompt.invoke({"question": state["question"], "context": docs_content})
    response = llm.invoke(messages)
    return {"answer": response.content}

graph_builder = StateGraph(State).add_sequence([retrieve, generate])
graph_builder.add_edge(START, "retrieve")
graph = graph_builder.compile()

async def ingest_uploaded_file(file: UploadFile):
    file_path = f"./{file.filename}"

    with open(file_path, "wb") as f:
        f.write(await file.read())

    loader = PyPDFLoader(file_path)
    pages = loader.load()

    
    for page in pages:
        print("PAGE", page.page_content)  

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    splits = text_splitter.split_documents(pages)

    vector_store.add_documents(splits)

    os.remove(file_path)

    return f"Loaded {len(splits)} document chunks from {file.filename}"






