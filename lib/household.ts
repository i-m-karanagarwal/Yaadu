import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { HOUSEHOLD_COOKIE } from "./auth";
import {
  getHouseholdsCollection,
  getMembersCollection,
  getShoppingListsCollection,
  toObjectId,
} from "./db";
import type { HouseholdDocument, MemberDocument } from "./household-document";
import type { ShoppingListDocument } from "./shopping-document";
import type { Household, Member } from "./types";

export interface HouseholdContext {
  householdId: ObjectId;
  household: Household;
  members: Member[];
}

export async function ensureDefaultHousehold(): Promise<HouseholdContext> {
  const householdsCol = await getHouseholdsCollection();
  const membersCol = await getMembersCollection();
  const listsCol = await getShoppingListsCollection();
  const now = new Date().toISOString();

  let household = await householdsCol.findOne({ isDefault: true });
  if (!household) {
    const doc: HouseholdDocument = {
      name: process.env.HOUSEHOLD_NAME || "My Home",
      isDefault: true,
      createdAt: now,
    };
    const result = await householdsCol.insertOne(doc);
    household = { ...doc, _id: result.insertedId };
  }

  const householdId = household._id!;

  let owner = await membersCol.findOne({ householdId, isOwner: true });
  if (!owner) {
    const memberDoc: MemberDocument = {
      householdId,
      name: process.env.HOUSEHOLD_OWNER_NAME || "You",
      roleLabel: "Family",
      isOwner: true,
      createdAt: now,
    };
    const result = await membersCol.insertOne(memberDoc);
    owner = { ...memberDoc, _id: result.insertedId };
  }

  const defaultList = await listsCol.findOne({ householdId, isDefault: true });
  if (!defaultList) {
    const listDoc: ShoppingListDocument = {
      householdId,
      name: "Groceries",
      isDefault: true,
      createdAt: now,
    };
    await listsCol.insertOne(listDoc);
  }

  const allMembers = await membersCol.find({ householdId }).toArray();

  return {
    householdId,
    household: serializeHousehold(household),
    members: allMembers.map(serializeMember),
  };
}

export async function getHouseholdContext(): Promise<HouseholdContext> {
  const cookieStore = await cookies();
  const cookieId = cookieStore.get(HOUSEHOLD_COOKIE)?.value;

  if (cookieId && ObjectId.isValid(cookieId)) {
    const householdsCol = await getHouseholdsCollection();
    const household = await householdsCol.findOne({
      _id: toObjectId(cookieId),
    });
    if (household) {
      const membersCol = await getMembersCollection();
      const members = await membersCol
        .find({ householdId: household._id! })
        .toArray();
      return {
        householdId: household._id!,
        household: serializeHousehold(household),
        members: members.map(serializeMember),
      };
    }
  }

  return ensureDefaultHousehold();
}

function serializeHousehold(doc: HouseholdDocument): Household {
  return {
    _id: doc._id!.toString(),
    name: doc.name,
  };
}

function serializeMember(doc: MemberDocument): Member {
  return {
    _id: doc._id!.toString(),
    name: doc.name,
    roleLabel: doc.roleLabel,
    isOwner: doc.isOwner,
  };
}
