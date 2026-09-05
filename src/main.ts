import "./style.css";
import { createGame } from "./game/createGame";
import { showTitleSplash } from "./ui/titleSplash";
import { TITLE_DISMISSED_EVENT } from "./game/events";

const container = document.getElementById("app");
if (!container) {
  throw new Error("Missing #app root element");
}

const game = createGame(container);

const titleSignUrl = `${import.meta.env.BASE_URL}assets/derek-sorry-town-sign.png`;
showTitleSplash(titleSignUrl, {
  onDismiss: () => game.events.emit(TITLE_DISMISSED_EVENT),
});
