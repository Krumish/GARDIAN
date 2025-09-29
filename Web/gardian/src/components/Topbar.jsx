import { useState, useRef, useEffect } from "react";
import { FaUserCircle } from "react-icons/fa";

export default function Topbar() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close menu if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="h-16 bg-gardian text-white flex items-center justify-end px-6 shadow-sm relative">
      <div className="flex items-center space-x-4 relative" ref={dropdownRef}>
        <span className="text-gray-200">Hello, Mich</span>
        
        {/* Profile Icon */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="focus:outline-none"
        >
          <FaUserCircle className="w-10 h-10 text-gray-300 hover:text-white" />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-14 right-0 w-48 bg-white rounded-lg shadow-lg text-gray-800">
            <ul className="py-2">
              <li>
                <a
                  href="#"
                  className="block px-4 py-2 hover:bg-gray-100"
                >
                  Profile
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="block px-4 py-2 hover:bg-gray-100"
                >
                  Settings
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="block px-4 py-2 hover:bg-gray-100 text-red-500"
                >
                  Log Out
                </a>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
