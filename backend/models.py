from sqlalchemy import Column, Integer, String, ForeignKey
from db import Base
from sqlalchemy.orm import Session, relationship

class Stack(Base):
    __tablename__ = "stacks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, index=True)
    qasets = relationship("QAset", back_populates="stack", cascade="all, delete-orphan")

class QAset(Base):
    __tablename__ = "qasets"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(String, index=True)
    answer = Column(String, index=True)
    stack_id = Column(Integer, ForeignKey("stacks.id"))
    stack = relationship("Stack", back_populates="qasets")
