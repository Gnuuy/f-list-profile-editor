import type { Bar, BarPose, Crack } from '../models/NalasBars';

// Sizes and colours from the bouncing bars prototype.
const PADDING = 20;
const COLUMN_GAP = 24;
const COLUMN_WIDTH = 161;
const LABEL_HEIGHT = 24;
const LABEL_FONT_SIZE = 16;
const LABEL_GAP = 12;
const SHELL_HEIGHT = 280;
const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 260;
const TRACK_BORDER = 1;

const LABEL_COLOUR = '#f2f2f2';
const TRACK_COLOUR = '#24272b';
const BORDER_COLOUR = '#3b3f45';
const FILL_COLOUR = '#ffffff';
const LABEL_FONT = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

// Sizes above are at 1×; the bars are drawn at twice that, so they stay sharp on high-resolution screens.
export const BARS_SCALE = 2;

/** The width for this many bars, at 1×. */
export function barsWidth(count: number): number {
  return PADDING * 2 + COLUMN_WIDTH * count + COLUMN_GAP * (count - 1);
}
export const BARS_HEIGHT = PADDING * 2 + LABEL_HEIGHT + LABEL_GAP + SHELL_HEIGHT;
/** Where the columns sit, so controls can line up under them. */
export const BARS_LAYOUT = { padding: PADDING, columnGap: COLUMN_GAP, columnWidth: COLUMN_WIDTH };

/** Draws the labels and bars, with each bar in its pose, filling a canvas `BARS_SCALE` times `barsWidth(bars.length)` wide. */
export function drawBars(
  context: CanvasRenderingContext2D,
  bars: readonly Bar[],
  poses: readonly BarPose[],
  background: string,
) {
  context.setTransform(BARS_SCALE, 0, 0, BARS_SCALE, 0, 0);
  context.fillStyle = background;
  context.fillRect(0, 0, barsWidth(bars.length), BARS_HEIGHT);

  bars.forEach((bar, index) => {
    const centre = PADDING + index * (COLUMN_WIDTH + COLUMN_GAP) + COLUMN_WIDTH / 2;
    drawLabel(context, bar.label, centre, PADDING + LABEL_HEIGHT / 2);
    drawTrack(context, poses[index], centre, PADDING + LABEL_HEIGHT + LABEL_GAP + SHELL_HEIGHT);
  });
}

function drawLabel(context: CanvasRenderingContext2D, label: string, centre: number, middle: number) {
  if (!label) return;
  context.fillStyle = LABEL_COLOUR;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  // Long labels shrink to fit their column.
  let size = LABEL_FONT_SIZE;
  context.font = `600 ${size}px ${LABEL_FONT}`;
  const width = context.measureText(label).width;
  if (width > COLUMN_WIDTH) {
    size = Math.max(8, Math.floor((size * COLUMN_WIDTH) / width));
    context.font = `600 ${size}px ${LABEL_FONT}`;
  }
  context.fillText(label, centre, middle);
}

function drawTrack(context: CanvasRenderingContext2D, pose: BarPose, centre: number, bottom: number) {
  context.save();
  // The prototype's transform, around the bottom centre of the bar.
  context.translate(centre, bottom);
  context.translate(pose.sway, -pose.lift);
  context.rotate((pose.tilt * Math.PI) / 180);
  context.scale(pose.scaleX, pose.scaleY);

  const left = -TRACK_WIDTH / 2;
  const top = -TRACK_HEIGHT;
  context.fillStyle = BORDER_COLOUR;
  context.beginPath();
  context.roundRect(left, top, TRACK_WIDTH, TRACK_HEIGHT, TRACK_WIDTH / 2);
  context.fill();

  const inner = {
    left: left + TRACK_BORDER,
    top: top + TRACK_BORDER,
    width: TRACK_WIDTH - TRACK_BORDER * 2,
    height: TRACK_HEIGHT - TRACK_BORDER * 2,
  };
  context.beginPath();
  context.roundRect(inner.left, inner.top, inner.width, inner.height, inner.width / 2);
  context.fillStyle = TRACK_COLOUR;
  context.fill();
  context.clip();

  const fillHeight = pose.fill * inner.height;
  context.fillStyle = FILL_COLOUR;
  context.fillRect(inner.left, inner.top + inner.height - fillHeight, inner.width, fillHeight);
  if (pose.crack) drawCrack(context, pose.crack, inner);
  context.restore();
}

/** Repeatable random numbers from 0 to 1, so a crack keeps its shape while it spreads and fades. */
function randomNumbers(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

type Point = [number, number];

/**
 * Jagged cracks fanning down from where the white hit the top, a few of them
 * branching. Each is drawn dark with a light edge, so it shows both on the
 * white and on the empty track.
 */
function drawCrack(
  context: CanvasRenderingContext2D,
  crack: Crack,
  inner: { left: number; top: number; width: number; height: number },
) {
  const random = randomNumbers(crack.seed);
  const origin: Point = [inner.left + inner.width / 2 + (random() - 0.5) * inner.width * 0.3, inner.top + 3];
  const lines: Point[][] = [];

  const jagged = (from: Point, heading: number, length: number, steps: number): Point[] => {
    const points: Point[] = [from];
    let [x, y] = from;
    let direction = heading;
    for (let step = 0; step < steps; step += 1) {
      direction += (random() - 0.5) * 0.9;
      const reach = (length / steps) * (0.6 + random() * 0.8);
      x += Math.cos(direction) * reach;
      y += Math.sin(direction) * reach;
      points.push([x, y]);
    }
    return points;
  };

  const count = 3 + Math.floor(random() * 3);
  for (let index = 0; index < count; index += 1) {
    // Fanned downwards, the outer ones running along the rounded top.
    const heading = Math.PI / 2 + ((index + 0.5) / count - 0.5) * 2.6 + (random() - 0.5) * 0.3;
    const main = jagged(origin, heading, (24 + random() * 36) * crack.spread, 5);
    lines.push(main);
    if (random() < 0.6) {
      const fork = main[2 + Math.floor(random() * 2)];
      lines.push(jagged(fork, heading + (random() < 0.5 ? -1 : 1) * (0.5 + random() * 0.5), (8 + random() * 14) * crack.spread, 3));
    }
  }

  const stroke = (colour: string, width: number, shift: number) => {
    context.strokeStyle = colour;
    context.lineWidth = width;
    context.beginPath();
    for (const line of lines) {
      line.forEach(([x, y], index) => {
        if (index === 0) context.moveTo(x + shift, y + shift);
        else context.lineTo(x + shift, y + shift);
      });
    }
    context.stroke();
  };

  context.save();
  context.globalAlpha = crack.fade;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  stroke('rgba(255, 255, 255, 0.45)', 0.8, 0.6);
  stroke('rgba(16, 17, 19, 0.85)', 1.3, 0);
  context.restore();
}
