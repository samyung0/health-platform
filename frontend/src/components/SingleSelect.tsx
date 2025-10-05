import { useState, useRef, useEffect } from "react";
import Transition from "../utils/Transition";
import { cn } from "~/lib/utils";

// TODO: set min select 1?

interface SingleSelectProps<T> {
  options: {
    id: T;
    name: string;
  }[];
  onSelectChange: (selected: T | null) => any;
  defaultLabel: string;
  defaultSelected?: T;
  className?: string;
  dropDownClassName?: string;
}

// TODO: refactor to use global state
function SingleSelect<T extends string | number>({
  options,
  onSelectChange,
  defaultLabel,
  defaultSelected,
  className,
  dropDownClassName,
}: SingleSelectProps<T>) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected] = useState(() => defaultSelected || null);

  const trigger = useRef<HTMLButtonElement>(null);
  const dropdown = useRef<HTMLDivElement>(null);

  // close on click outside
  useEffect(() => {
    const clickHandler = ({ target }: PointerEvent) => {
      if (!dropdown.current || !(target instanceof Node)) return;
      if (!dropdownOpen || dropdown.current.contains(target) || trigger.current?.contains(target))
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

  useEffect(() => {
    onSelectChange(selected);
  }, [selected]);

  useEffect(() => {
    setSelected(defaultSelected ?? null);
  }, [defaultSelected]);

  return (
    <div className="relative">
      <button
        ref={trigger}
        className={cn(
          "btn justify-between min-w-44 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100",
          className
        )}
        aria-label="Select date range"
        aria-haspopup="true"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-expanded={dropdownOpen}
      >
        <span className="flex items-center">
          <span>
            {selected !== null
              ? options.find((option) => option.id === selected)?.name ?? defaultLabel
              : defaultLabel}
          </span>
        </span>
        <svg
          className="shrink-0 ml-1 fill-current text-gray-400 dark:text-gray-500"
          width="11"
          height="7"
          viewBox="0 0 11 7"
        >
          <path d="M5.4 6.8L0 1.4 1.4 0l4 4 4-4 1.4 1.4z" />
        </svg>
      </button>
      <Transition
        show={dropdownOpen}
        tag="div"
        className="z-10 absolute top-full right-0 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 py-1.5 rounded-lg shadow-lg overflow-hidden mt-1"
        enter="transition ease-out duration-100 transform"
        enterStart="opacity-0 -translate-y-2"
        enterEnd="opacity-100 translate-y-0"
        leave="transition ease-out duration-100"
        leaveStart="opacity-100"
        leaveEnd="opacity-0"
      >
        <div
          ref={dropdown}
          className={cn("font-medium text-sm text-gray-600 dark:text-gray-300", dropDownClassName)}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => setDropdownOpen(false)}
        >
          {options.map((option) => {
            return (
              <button
                key={option.id}
                tabIndex={0}
                className={`flex items-center w-full hover:bg-gray-50 dark:hover:bg-gray-700/20 py-1 px-3 cursor-pointer ${
                  selected === option.id && "text-violet-500"
                }`}
                onClick={() => {
                  setSelected(option.id);
                  setDropdownOpen(false);
                }}
              >
                <svg
                  className={`shrink-0 mr-2 fill-current text-violet-500 ${
                    selected !== option.id && "invisible"
                  }`}
                  width="12"
                  height="9"
                  viewBox="0 0 12 9"
                >
                  <path d="M10.28.28L3.989 6.575 1.695 4.28A1 1 0 00.28 5.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28.28z" />
                </svg>
                <span>{option.name}</span>
              </button>
            );
          })}
        </div>
      </Transition>
    </div>
  );
}

export default SingleSelect;
