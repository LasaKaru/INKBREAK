import "./styles.css";
import { Game } from "./game/Game";

const canvas = document.getElementById("scene") as HTMLCanvasElement;

// boot
new Game(canvas);
