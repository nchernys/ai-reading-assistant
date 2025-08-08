"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import Navigation from "../components/navigation/nav";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUpload,
  faCopy,
  faSpinner,
  faXmark,
  faPen,
} from "@fortawesome/free-solid-svg-icons";

type FlashCardStack = {
  id: number;
  name: string;
  description?: string;
};

type FormDataState = {
  file: File | null;
};

export default function Schedule() {
  const [collection, setCollection] = useState<FlashCardStack[]>([]);
  const [response, setResponse] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormDataState>({ file: null });

  useEffect(() => {
    fetchFlashCards();
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "stackUpdated") {
        fetchFlashCards();
        localStorage.removeItem("stackUpdated");
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const fetchFlashCards = async () => {
    try {
      const response = await fetch("http://localhost:8000/get-flash-cards");
      const result = await response.json();
      setCollection(result);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { type, files, name, value } = target;

    if (type === "file" && files?.[0]) {
      setFormData((prev) => ({
        ...prev,
        file: files[0],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResponse("");
    setLoading(true);

    if (!formData.file) {
      console.error("File is required");
      setLoading(false);
      return;
    }

    const data = new FormData();
    data.append("file", formData.file);

    try {
      const response = await fetch("http://localhost:8000/create-flash-cards", {
        method: "POST",
        body: data,
      });

      const result = await response.json();
      console.log(result);
      fetchFlashCards();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStack = async (stackId: number) => {
    try {
      const response = await fetch(
        `http://localhost:8000/delete-flash-cards/${stackId}`,
        { method: "DELETE" }
      );
      const data = await response.json();
      console.log(data);
      fetchFlashCards();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full flex">
      <Navigation />
      <div className="w-2/3 p-12 mx-auto z-1000">
        {loading && (
          <div>
            <FontAwesomeIcon
              icon={faSpinner}
              className="absolute left-1/2 top-1/2 text-4xl z-1000"
              spinPulse
            />
          </div>
        )}

        <h1 className="text-6xl font-bold mb-16 w-full relative">
          Create Quiz Flashcards
        </h1>

        <form
          onSubmit={handleSubmit}
          className="w-full flex flex-col items-start gap-6"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <label
              htmlFor="upload"
              className="relative flex flex-col gap-4 items-start justify-center cursor-pointer"
            >
              <span className="border border-gray-600 rounded-md flex gap-4 items-center justify-center px-8 py-2">
                <FontAwesomeIcon icon={faUpload} className="text-md w-4" />
                Upload File
              </span>
              <input
                type="file"
                onChange={handleChange}
                className="opacity-0 absolute left-0 top-0 w-full h-full"
                accept="application/pdf"
                required
              />
            </label>

            <button className="bg-blue-500 p-2 w-44 rounded-md transition-transform active:translate-y-[5px]">
              Create Flash Cards
            </button>
          </div>

          {formData?.file && (
            <div className="box-border px-4 py-2 break-all rounded-md bg-gray-500/50">
              {formData.file.name}
            </div>
          )}
        </form>

        <div className="mt-16 w-full">
          <h2 className="text-lg font-bold my-4">Your Flash Card Stacks</h2>
          <div className="h-full w-full mx-auto rounded-md py-4 flex flex-col md:flex-row md:flex-wrap justify-start gap-4 relative">
            {collection.length > 0
              ? collection.map((stack) => (
                  <div
                    key={stack.id}
                    className="relative md:w-[31%] bg-blue-500 text-white rounded-2xl"
                  >
                    <a
                      href={`/flash-cards/${stack.id}`}
                      className="w-full h-22 py-2 px-12 flex items-center justify-center text-center"
                      target="_blank"
                    >
                      {stack.name}
                    </a>
                    <div className="absolute top-2 right-2 flex flex-col gap-2">
                      <div
                        className="w-8 h-8 bg-blue-300 flex justify-center items-center rounded-full cursor-pointer"
                        onClick={() => handleDeleteStack(stack.id)}
                      >
                        <FontAwesomeIcon icon={faXmark} />
                      </div>
                      <a href={`/flash-cards/edit/${stack.id}`} target="_blank">
                        <div className="w-8 h-8 bg-blue-300 flex justify-center items-center rounded-full">
                          <FontAwesomeIcon icon={faPen} />
                        </div>
                      </a>
                    </div>
                  </div>
                ))
              : [...Array(3)].map((_, index) => (
                  <div
                    key={index}
                    className="relative md:w-[31%] h-22 py-2 px-12 flex justify-center items-center bg-blue-300/75 text-white rounded-2xl border-2 border-dashed border-gray-100"
                  >
                    Your Stack Name
                    <div className="absolute top-2 right-2 flex flex-col gap-2">
                      <div className="w-8 h-8 bg-blue-300 flex justify-center items-center rounded-full">
                        <FontAwesomeIcon icon={faXmark} />
                      </div>
                      <div className="w-8 h-8 bg-blue-300 flex justify-center items-center rounded-full">
                        <FontAwesomeIcon icon={faPen} />
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}
