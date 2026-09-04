import "./style.css";
import { createGame } from "./game/createGame";

const container = document.getElementById("app");
if (!container) {
  throw new Error("Missing #app root element");
}

createGame(container);
