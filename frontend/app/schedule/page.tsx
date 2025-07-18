"use client";
import { useState } from "react";
import Navigation from "../components/navigation/nav";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

export default function Schedule() {
  const [response, setResponse] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    question: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target as HTMLTextAreaElement;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResponse("");
    try {
      const response = await fetch("http://localhost:8000/calendar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        setLoading(false);
        setResponse(result.response.output);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="w-full flex">
      <Navigation />
      <div className="w-1/2 p-8 mx-auto">
        <h1 className="text-2xl font-bold mb-8 w-full h-22 relative">
          <Image
            src="/calendar-assistant2.svg"
            alt="Google AI Assistant"
            fill
            className="object-contain object-center"
          />
        </h1>
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
          <textarea
            onChange={handleChange}
            value={formData.question}
            className="p-4 border border-gray-500 rounded-md"
            name="question"
            id="calendar-request"
            placeholder="E.g. 'Do I have anything scheduled for this Friday between 3 PM and 8 PM?'"
            rows={5}
            required
          ></textarea>
          <button className="bg-blue-500 p-2 rounded-md transition-transform active:translate-y-[5px]">
            Ask
          </button>
        </form>
        <div className="mt-8 w-full h-44">
          <h2 className="text-lg font-bold my-4">AI Assistant:</h2>
          <div className="output h-full overflow-y-auto w-full mx-auto border border-gray-500 rounded-md p-4 relative">
            {loading && (
              <div>
                <FontAwesomeIcon
                  icon={faSpinner}
                  className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl"
                  spinPulse
                />
              </div>
            )}
            <ReactMarkdown>{response}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
