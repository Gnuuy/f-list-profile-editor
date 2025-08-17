'use client';

import ColourButton from "./ColourButton";

const COLORS = [
  'red','orange','yellow','green','cyan','purple',
  'blue','pink','black','brown','white','grey',
];

export default function ColourMenu() {
  return (
    <div>
      <ul>
        {COLORS.map((color) => <ColourButton />)}
      </ul>
    </div>
  )
}
