"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";

type Props = React.ComponentProps<typeof Input>;

export const NumberInput = React.forwardRef<HTMLInputElement, Props>(
  (props, ref) => {
    return <Input ref={ref} type="number" inputMode="numeric" {...props} />;
  },
);

NumberInput.displayName = "NumberInput";
