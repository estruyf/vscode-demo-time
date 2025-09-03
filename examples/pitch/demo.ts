export function greet(name: string): string {
  return `Hello, ${name}!`;
}

export function say(value: string): string {
  return `${value}!`;
}

// Sample usage
console.log(greet("user"));
console.log(say("Have fun using Demo Time"));