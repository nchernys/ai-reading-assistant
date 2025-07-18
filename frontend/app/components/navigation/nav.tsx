"use client";
import { clsx } from "clsx";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    {
      tabName: "TEXTIFY",
      tabLink: "/",
    },
    {
      tabName: "SCHEDULE",
      tabLink: "/schedule",
    },
  ];

  return (
    <div className="w-16 min-w-16 h-screen absolute top-0 left-0">
      {tabs &&
        tabs.map((tab, index) => (
          <div
            key={tab.tabName}
            style={{ top: index * 12 + "rem", zIndex: (index / 3) * 1000 }}
            className={clsx(
              "w-full left-0 absolute border border-blue-500 h-56 rounded-r-4xl shadow-gray-950 text-md text-gray-900 cursor-pointer transform -translate-x-4 hover:translate-x-0 duration-400",
              tab.tabLink === pathname
                ? "bg-blue-500 text-white"
                : "bg-gray-300"
            )}
            onClick={() => {
              router.push(tab.tabLink);
            }}
          >
            <div
              className="rotate-[-90deg] origin-center absolute flex items-center justify-center w-4 h-4 overflow-visible left-[35%] whitespace-nowrap font-semibold"
              style={{ bottom: "calc(50% - .4rem)" }}
            >
              {tab.tabName}
            </div>
          </div>
        ))}
    </div>
  );
}
