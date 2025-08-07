"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

type Qaset = {
  id: number;
  question: string;
  answer: string;
};

type EditStackState = {
  name: string;
  description: string;
  qasets: Qaset[];
};

const EditStack = () => {
  const params = useParams();
  const id = params?.id;

  const [editSuccessMessage, setEditSuccessMessage] = useState(false);
  const [editStack, setEditStack] = useState<EditStackState>({
    name: "",
    description: "",
    qasets: [],
  });

  useEffect(() => {
    const fetchStack = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/get-flash-cards/${id}`
        );
        const data = await response.json();
        setEditStack(data);
      } catch (err) {
        console.error(err);
      }
    };

    if (id) {
      fetchStack();
    }
  }, [id]);

  const handleChangeEdit = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditStack((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleQasetChange = (
    qaId: number,
    field: keyof Qaset,
    value: string
  ) => {
    setEditStack((prev) => {
      const updatedQasets = prev.qasets.map((qa) =>
        qa.id === qaId ? { ...qa, [field]: value } : qa
      );
      return {
        ...prev,
        qasets: updatedQasets,
      };
    });
  };

  const handleSubmitEdit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:8000/edit-flash-cards", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editStack),
      });

      await response.json();
      setEditSuccessMessage(true);
      localStorage.setItem("stackUpdated", Date.now().toString());

      setTimeout(() => {
        setEditSuccessMessage(false);
      }, 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full flex">
      <div className="w-2/3 p-12 mx-auto">
        <Link
          href="/flash-cards"
          className="text-blue-400 flex items-center gap-4"
        >
          <span className="text-2xl">
            <FontAwesomeIcon icon={faArrowLeft} />
          </span>
          <span>Return</span>
        </Link>

        <div className="my-4">
          <form onSubmit={handleSubmitEdit}>
            {editSuccessMessage && (
              <div className="w-1/3 bg-blue-500 shadow-2xl rounded-md fixed top-1/4 left-1/3 z-10 flex justify-center items-center p-8">
                Your changes are saved successfully!
              </div>
            )}

            <div className="flex flex-col my-4 gap-4 py-4">
              <textarea
                className="w-full text-4xl p-2 border-2 rounded-md border-gray-700/50"
                name="name"
                value={editStack.name}
                onChange={handleChangeEdit}
              />
              <textarea
                className="w-full p-2 border-2 rounded-md  border-gray-700/50"
                name="description"
                value={editStack.description}
                onChange={handleChangeEdit}
              />
            </div>

            {editStack.qasets.map((qa, index) => (
              <div key={qa.id} className="my-4 w-full gap-4 flex">
                <div className="p-2 w-[3rem]">{index + 1}</div>
                <textarea
                  rows={3}
                  className="w-1/2 p-2 rounded-md border-2 border-gray-700/50"
                  name="question"
                  value={qa.question}
                  onChange={(e) =>
                    handleQasetChange(qa.id, "question", e.target.value)
                  }
                />
                <textarea
                  rows={3}
                  className="w-1/2 p-2 border-2 border-gray-700/50"
                  name="answer"
                  value={qa.answer}
                  onChange={(e) =>
                    handleQasetChange(qa.id, "answer", e.target.value)
                  }
                />
              </div>
            ))}

            <button className="bg-blue-500 text-xl py-4 px-12 my-8 rounded-md">
              Save
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditStack;
