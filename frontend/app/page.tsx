"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload, faCopy, faSpinner } from "@fortawesome/free-solid-svg-icons";
import Navigation from "./components/navigation/nav";

export default function Home() {
  const [response, setResponse] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    file: null as File | null,
    action: "",
  });
  const markdownRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { type, value, files, name } = e.target as HTMLInputElement;

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResponse("");
    setLoading(true);
    if (!formData.file) {
      console.error("File is required");
      return;
    }

    const data = new FormData();
    data.append("file", formData.file);
    data.append("action", formData.action);

    console.log(formData, data);
    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        body: data,
      });

      const result = await response.json();
      console.log(result);
      setResponse(result.response);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error("Error:", error);
    }
  };

  const handleCopy = () => {
    if (markdownRef.current) {
      const text = markdownRef.current.innerText;
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      });
    }
  };

  return (
    <div className="w-full flex">
      <Navigation />
      <div className="w-full h-full p-8 ps-16 pt-12 box-border">
        <div className="w-9/12 mx-auto">
          <h1 className="w-2/3 h-[5rem] text-5xl font-bold align-left relative mb-8">
            AI Summarize &bull; Clarify &bull; Quiz
          </h1>
        </div>
        <div className="flex flex-col md:flex-row w-full md:w-9/12 items-start justify-start gap-8 h-[32rem] mx-auto">
          <form
            onSubmit={handleSubmit}
            className=" w-full md:w-1/3 flex box-border flex-col gap-4"
          >
            <label
              htmlFor="file"
              className="relative w-full border border-gray-600 rounded-md p-4"
            >
              <div className="w-full flex gap-4">
                <div className="">
                  <strong>Upload PDF</strong>
                </div>
                <div className="text-md">
                  <FontAwesomeIcon icon={faUpload} className="text-md" />
                </div>
              </div>
              <input
                type="file"
                name="file"
                onChange={handleChange}
                className="absolute left-0 top-0 p-4 box-border w-full cursor-pointer"
                style={{ opacity: 0 }}
                accept=".pdf"
                required
              />
              {formData?.file && (
                <div className="w-full box-border pt-2 break-all">
                  {" "}
                  {formData.file.name}{" "}
                </div>
              )}
            </label>
            <select
              name="action"
              id="action"
              onChange={handleChange}
              value={formData.action}
              className="bg-[var(--bg-dark)] border border-gray-600 box-border rounded-md px-4 pe-0 py-2"
              required
            >
              <option value="" disabled>
                Select an option...
              </option>
              <option value="summarize-paragraph">
                Summarize (paragraph){" "}
              </option>
              <option value="summarize-bullets">
                Summarize (bullet points)
              </option>
              <option value="list-concepts">List concepts & definitions</option>
              <option value="quiz-me">Quiz me! (10 questions)</option>
            </select>

            <button className="bg-blue-500 text-white px-4 py-2 rounded-md transition-transform active:translate-y-[5px]">
              Ask
            </button>
          </form>

          <div
            ref={markdownRef}
            className="output relative w-full md:w-2/3 h-full border rounded-md border-gray-600 p-2 pt-4 box-border overflow-auto leading-relaxed"
          >
            {loading && (
              <div>
                <FontAwesomeIcon
                  icon={faSpinner}
                  className="absolute left-1/2 top-1/2 text-2xl"
                  spinPulse
                />
              </div>
            )}
            {response && (
              <div
                onClick={handleCopy}
                className="sticky top-2 right-2 float-right bg-[var(--bg-dark)] flex gap-2 text-lg z-1000"
              >
                {copied && (
                  <div className="absolute text-sm px-2 py-1 top-2 -left-20 rounded-sm bg-white text-black">
                    Copied!
                  </div>
                )}
                <FontAwesomeIcon icon={faCopy} />
              </div>
            )}

            <div className="w-full p-4">
              {response && <ReactMarkdown>{response}</ReactMarkdown>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
