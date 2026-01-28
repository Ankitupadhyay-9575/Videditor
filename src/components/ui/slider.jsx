import * as React from 'react';
import { cn } from '@/lib/utils';

const Slider = React.forwardRef(({ className, min = 0, max = 100, step = 1, value = [0], onValueChange, ...props }, ref) => {
  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value);
    onValueChange?.([newValue]);
  };

  return (
    <input
      type="range"
      ref={ref}
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={handleChange}
      className={cn(
        'w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer slider',
        className
      )}
      {...props}
    />
  );
});
Slider.displayName = 'Slider';

export { Slider };
