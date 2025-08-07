from pydantic import BaseModel
from typing import List

# Nested QAset model
class QAsetSchema(BaseModel):
    id: int
    question: str
    answer: str

    class Config:
        orm_mode = True

# Main Stack model with list of QAs
class StackSchema(BaseModel):
    id: int
    name: str
    description: str
    qasets: List[QAsetSchema]

    class Config:
        orm_mode = True
