import { LRParser } from "@lezer/lr";
import { parser as rawParser } from "./huml-parser";

export const parser: LRParser = rawParser;
