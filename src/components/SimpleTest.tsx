import { useState } from "react";

export const SimpleTest = () => {
  const [count, setCount] = useState(0);
  
  return (
    <div className="p-4 bg-blue-100 text-blue-800 rounded">
      <h1>Hola Mundo - Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>Incrementar</button>
    </div>
  );
};