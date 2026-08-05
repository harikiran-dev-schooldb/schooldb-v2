"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export const DateInput = React.forwardRef<HTMLInputElement, Props>(
  function DateInput(props, ref) {
    return <Input ref={ref} type="date" {...props} />;
  },
);
