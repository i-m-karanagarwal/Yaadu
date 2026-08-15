import type { ObjectId } from "mongodb";
import type { ShoppingCategory } from "./types";

export interface ShoppingListDocument {
  _id?: ObjectId;
  householdId: ObjectId;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

export interface ShoppingItemDocument {
  _id?: ObjectId;
  householdId: ObjectId;
  listId: ObjectId;
  name: string;
  category: ShoppingCategory;
  quantity: string | null;
  done: boolean;
  rawText: string;
  createdAt: string;
}
