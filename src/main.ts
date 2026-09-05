import "./style.css";
import { asset } from "./game/assets";
import { createGame } from "./game/createGame";
import { showTitleSplash } from "./ui/titleSplash";
import { TITLE_DISMISSED_EVENT } from "./game/events";

const container = document.getElementById("app");
if (!container) {
  throw new Error("Missing #app root element");
}

const game = createGame(container);

showTitleSplash(asset("derek-sorry-town-sign.png"), {
  onDismiss: () => game.events.emit(TITLE_DISMISSED_EVENT),
});
