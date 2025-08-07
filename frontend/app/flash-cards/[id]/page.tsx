"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowsRotate } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

type Stack = {
  question: string;
  answer: string;
};

import {
  faSquareCaretRight,
  faSquareCaretLeft,
} from "@fortawesome/free-solid-svg-icons";

const FlashCards = () => {
  const { id } = useParams();
  const [stack, setStack] = useState<Stack[]>([]);
  const [currentCard, setCurrentCard] = useState<number>(0);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);

  useEffect(() => {
    const fetchFlashCards = async () => {
      const response = await fetch(
        `http://localhost:8000/get-flash-cards/${id}`
      );
      const result = await response.json();
      console.log(result);
      setStack(result.qasets);
    };
    fetchFlashCards();
  }, []);

  const handleForward = () => {
    setCurrentCard((prev) => (prev < 9 ? prev + 1 : prev));
  };

  const handleBackwards = () => {
    setCurrentCard((prev) => (prev > 0 ? prev - 1 : prev));
  };

  return (
    <>
      <Link
        href="/flash-cards"
        className="text-blue-400 flex  px-8 py-4 items-center gap-4"
      >
        <span className="text-2xl">
          <FontAwesomeIcon icon={faArrowLeft} />
        </span>
        <span>Return</span>
      </Link>
      <div className="w-full h-full flex justify-center pt-32">
        <div
          className={`w-44 text-7xl flex justify-center items-center ${
            currentCard !== 0
              ? "text-white  hover:text-blue-500"
              : "text-gray-500"
          }`}
          onClick={handleBackwards}
        >
          <FontAwesomeIcon icon={faSquareCaretLeft} />
        </div>

        {showAnswer ? (
          <div className="w-1/2 h-96 border bg-white text-gray-800 p-8 flex flex-col gap-4 rounded-xl justify-center items-center relative">
            <h3 className="font-bold text-4xl">Answer {currentCard + 1}:</h3>
            <div className="text-center text-xl">
              {stack[currentCard]?.answer}
            </div>
            <FontAwesomeIcon
              className="absolute bottom-8 right-8 text-4xl text-gray-300  hover:text-blue-300"
              icon={faArrowsRotate}
              onClick={() => setShowAnswer(false)}
            />
          </div>
        ) : (
          <div className="w-1/2 h-96 border bg-white text-gray-800 p-8 flex flex-col gap-4 rounded-xl justify-center items-center relative">
            <h3 className="font-bold text-4xl">Question {currentCard + 1}:</h3>
            <div className="text-center text-xl">
              {stack[currentCard]?.question}
            </div>
            <FontAwesomeIcon
              className="absolute bottom-8 right-8 text-4xl text-gray-300  hover:text-blue-300"
              icon={faArrowsRotate}
              onClick={() => setShowAnswer(true)}
            />
          </div>
        )}
        <div
          className={`w-44 text-7xl flex justify-center items-center ${
            currentCard !== 9
              ? "text-white  hover:text-blue-500"
              : "text-gray-500"
          }`}
          onClick={handleForward}
        >
          <FontAwesomeIcon icon={faSquareCaretRight} />
        </div>
      </div>
    </>
  );
};

export default FlashCards;
