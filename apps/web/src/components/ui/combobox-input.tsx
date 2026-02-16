"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ComboboxInputProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  emptyMessage?: string;
}

export function ComboboxInput({
  options,
  value,
  onChange,
  placeholder,
  emptyMessage = "No results found.",
}: ComboboxInputProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between focus-visible:ring-primary h-9 font-medium px-3 text-left"
        >
          {value ? (
            <span className="truncate">{value}</span>
          ) : (
            <span className="text-muted-foreground font-normal truncate">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder={placeholder}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              <div className="p-2">
                <p className="text-sm text-muted-foreground mb-2 text-center">{emptyMessage}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-auto py-1.5 px-2 font-normal"
                  onClick={() => {
                    if (inputValue.trim()) {
                      onChange(inputValue);
                      setOpen(false);
                    }
                  }}
                >
                  Use "{inputValue}"
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={(currentValue) => {
                    // cmdk returns lowercase value. Match it back to original option.
                    const matchedOption =
                      options.find((o) => o.toLowerCase() === currentValue.toLowerCase()) ||
                      currentValue;
                    onChange(matchedOption === value ? "" : matchedOption);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value === option ? "opacity-100" : "opacity-0")}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
