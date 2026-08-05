"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export const TimeInput = React.forwardRef<HTMLInputElement, Props>(
  function TimeInput(props, ref) {
    return <Input ref={ref} type="time" step="60" {...props} />;
  },
);
