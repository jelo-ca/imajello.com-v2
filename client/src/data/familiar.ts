import { content } from '../content';

export const FAMILIAR_ANIMALS = content.familiar.animals;
export const FAMILIAR_FOOD = content.familiar.food;
export const FAMILIAR_GREETINGS: Record<string, string> = content.familiar.greetings;

export function rollFamiliar(): string {
  const isFood = Math.random() < 1 / 20;
  const pool = isFood ? FAMILIAR_FOOD : FAMILIAR_ANIMALS;
  return pool[Math.floor(Math.random() * pool.length)];
}
