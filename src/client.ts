import mainApp from "./main";
import { treaty } from "@elysiajs/eden";

export const newClient = treaty<typeof mainApp>;
