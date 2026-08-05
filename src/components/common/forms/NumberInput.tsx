"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export const NumberInput = React.forwardRef<HTMLInputElement, Props>(
  function NumberInput(props, ref) {
    return <Input ref={ref} type="number" {...props} />;
  },
);
