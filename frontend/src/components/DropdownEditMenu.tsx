import React, { useState, useRef, useEffect } from "react";
import Transition from "../utils/Transition";

function DropdownEditMenu({
  children,
  align,
  className,
  ...rest
}: {
  children: React.ReactNode;
  align?: "right" | "left";
  className?: string;
  rest?: React.HTMLProps<HTMLDivElement>;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const trigger = useRef<HTMLButtonElement>(null);
  const dropdown = useRef<HTMLUListElement>(null);

  // close on click outside
  useEffect(() => {
    const clickHandler = ({ target }: PointerEvent) => {
      if (!dropdown.current || !(target instanceof Node)) return;
      if (!dropdownOpen || dropdown.current?.contains(target) || trigger.current?.contains(target))
        return;
      setDropdownOpen(false);
    };
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  });

  // close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }: { keyCode: number }) => {
      if (!dropdownOpen || keyCode !== 27) return;
      setDropdownOpen(false);
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  });

  return (
    <div className={className} {...rest}>
      <button
        ref={trigger}
        className={`rounded-full ${
          dropdownOpen
            ? "bg-gray-100 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400"
            : "text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
        }`}
        aria-haspopup="true"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-expanded={dropdownOpen}
      >
        <span className="sr-only">Menu</span>
        <svg className="w-8 h-8 fill-current" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="2" />
          <circle cx="10" cy="16" r="2" />
          <circle cx="22" cy="16" r="2" />
        </svg>
      </button>
      <Transition
        show={dropdownOpen}
        tag="div"
        className={`origin-top-right z-10 absolute top-full min-w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 py-1.5 rounded-lg shadow-lg overflow-hidden mt-1 ${
          align === "right" ? "right-0" : "left-0"
        }`}
        enter="transition ease-out duration-200 transform"
        enterStart="opacity-0 -translate-y-2"
        enterEnd="opacity-100 translate-y-0"
        leave="transition ease-out duration-200"
        leaveStart="opacity-100"
        leaveEnd="opacity-0"
      >
        <ul
          ref={dropdown}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => setDropdownOpen(false)}
        >
          {children}
        </ul>
      </Transition>
    </div>
  );
}

export default DropdownEditMenu;
