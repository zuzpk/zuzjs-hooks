import { RefObject,useEffect } from "react";
import { useState } from "react";
import { useRef } from "react";

export type Command = {
  label: string;
  value: string;
  icon?: string;
  type?: 'command' | 'submenu' | 'action';
  subCommands?: Command[];
  action?: React.ReactNode | ((props: { onSelect: (value: string) => void }) => React.ReactNode);
  // action?: React.ReactNode | ((props: { onSelect: (value: string) => void }) => React.ReactNode);
};

export type CommandActionProps = {
  command?: string;
  commands?: Command[];
  cmd?: (value: string, textarea: HTMLTextAreaElement | HTMLInputElement) => void;
  ref: RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
};

const useCommandActions = ({
  command = '/',
  commands = [],
  cmd,
  ref,
}: CommandActionProps) => {

  const [commandStart, setCommandStart] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const parentRef = useRef<HTMLDivElement>(null);

  const handleInput = (event: React.FormEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const textarea = ref.current;
    if (textarea && showDropdown) {
      const { value } = textarea;
      if (commandStart < 0 || commandStart >= value.length || value[commandStart] !== command) {
        setShowDropdown(false);
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const textarea = ref.current;
    if (!textarea) return;

    const { selectionStart } = textarea;

    if (event.key === command) {
      setCommandStart(selectionStart || -1);
      const caretPos = getCaretCoordinates(textarea, selectionStart || -1);
      setDropdownPosition({
        top: caretPos.top + 20,
        left: caretPos.left,
      });
      setShowDropdown(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setShowDropdown(false);
    }
  };

  const handleCommandSelect = (value: string) => {
    const textarea = ref.current;
    if (!textarea) return;

    if (cmd) {
      cmd(value, textarea);
    } else {
      const { value: currentValue, selectionStart } = textarea;
      const newValue =
        currentValue.slice(0, commandStart) +
        value +
        currentValue.slice(selectionStart || -1);
      textarea.value = newValue;
      textarea.setSelectionRange(commandStart + value.length, commandStart + value.length);
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
    }

    setShowDropdown(false);
    textarea.focus();
  };

  const getCaretCoordinates = (element: HTMLTextAreaElement | HTMLInputElement, position: number) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      return { top: 0, left: 0 };
    }

    const style = window.getComputedStyle(element);
    context.font = `${style.fontSize} ${style.fontFamily}`;
    const text = element.value.substring(0, position);
    const lines = text.split('\n');
    const lastLine = lines[lines.length - 1];

    const left = context.measureText(lastLine).width;
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
    const top = (lines.length - 1) * lineHeight;

    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const scrollTop = element.scrollTop;

    canvas.remove();

    return {
      top: top - scrollTop + paddingTop,
      left: left + paddingLeft,
    };
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        ref.current &&
        parentRef.current &&
        !ref.current.contains(event.target as Node) &&
        !parentRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref]);

  return {
    showDropdown,
    dropdownPosition,
    handleKeyDown,
    handleInput,
    handleCommandSelect,
    parentRef,
  };

}

export default useCommandActions