import type { ObjectId } from "mongodb";

export interface HouseholdDocument {
  _id?: ObjectId;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

export interface MemberDocument {
  _id?: ObjectId;
  householdId: ObjectId;
  name: string;
  /** Indian household role label — Papa, Mummy, Karan, etc. */
  roleLabel: string;
  isOwner: boolean;
  createdAt: string;
}
