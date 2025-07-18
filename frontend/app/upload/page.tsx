"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload, faCopy, faSpinner } from "@fortawesome/free-solid-svg-icons";
import Navigation from "../components/navigation/nav";
import clsx from "clsx";

export default function Upload() {
  const [response, setResponse] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [uploaded, setUploaded] = useState<boolean>(false);
  const markdownRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [uploadedFiles, setUploadFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({ question: "" });

  const handleChangeRequest = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { value, name } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleChangeUpload = async (e: React.FormEvent<HTMLInputElement>) => {
    e.preventDefault();
    setUploaded(false);
    const { files } = e.target as HTMLInputElement;
    if (files) {
      setUploadFiles(Array.from(files));
    }
    const uploadedFilesCollection = new FormData();
    Array.from(files || []).forEach((file: File) => {
      uploadedFilesCollection.append("files", file);
    });
    try {
      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: uploadedFilesCollection,
      });
      const result = await response.json();
      console.log(result);
      setUploaded(true);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleSubmitAsk = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/upload/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      console.log(result);
      setResponse(result.answer);
      setLoading(false);
    } catch (error) {
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
      <div className="w-full h-full p-8 box-border">
        <div className="w-11/12 mx-auto">
          <h1 className="w-11/12 h-[6rem] text-center relative mb-8">
            <Image
              src="/upload-title2.svg"
              fill
              className="object-contain object-left"
              alt="Upload, Clarify, and Analyze"
            />
          </h1>
        </div>
        <div className="flex w-11/12 items-start justify-start gap-8 h-[32rem] mx-auto">
          <div className="w-1/3 flex flex-col gap-4">
            <form className="w-full flex box-border flex-col gap-4">
              <label
                htmlFor="file"
                className="relative w-full border border-gray-600 rounded-md p-4 gap-4"
              >
                <div className="w-full flex gap-4">
                  <div className="">
                    <strong>Upload PDF(s)</strong>
                  </div>
                  <div className="text-md">
                    <FontAwesomeIcon icon={faUpload} className="text-md" />
                  </div>
                </div>
                <input
                  type="file"
                  name="file"
                  onChange={handleChangeUpload}
                  className="absolute left-0 top-0 p-4 box-border w-full cursor-pointer"
                  style={{ opacity: 0 }}
                  accept=".pdf"
                  multiple
                  required
                />
                <div className="text-md overflow-y-auto max-h-26">
                  {uploadedFiles &&
                    uploadedFiles.map((file, index) => (
                      <>
                        {" "}
                        <span
                          key={index}
                          className={clsx(
                            "w-full box-border pt-2 break-all",
                            uploaded ? "opacity-20" : ""
                          )}
                        >
                          {file.name}
                        </span>{" "}
                        <br />
                      </>
                    ))}
                </div>
              </label>
            </form>

            <form
              onSubmit={handleSubmitAsk}
              className="w-full flex box-border flex-col gap-4"
            >
              <textarea
                className="border border-gray-600 rounded-md p-4"
                name="question"
                id="question"
                onChange={handleChangeRequest}
                value={formData.question}
                rows={8}
              ></textarea>
              <button className="bg-blue-500 text-white px-4 py-2 rounded-md transition-transform active:translate-y-[5px]">
                Ask
              </button>
            </form>
          </div>
          <div
            ref={markdownRef}
            className="output relative w-2/3 h-full border rounded-md border-gray-600 p-2 box-border overflow-auto leading-relaxed"
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
