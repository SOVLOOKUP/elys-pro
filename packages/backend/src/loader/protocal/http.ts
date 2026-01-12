import ky from "ky";
import { addProtocol } from ".";

const loadHttpModule = async (url: string) => await ky.get(url).text();

// addProtocol("http", (args) => loadHttpModule(`http:${args.path}`));
addProtocol("https", (args) => loadHttpModule(`https:${args.path}`));
