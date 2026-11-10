// Pure vector SVG generator for Realistic Anatomical Muscle Heatmap (Front and Back)
// Trace-mapped directly to high-fidelity anatomical references (front.png & back.png)
// Exactly 16 canonical muscles with shared IDs for bilateral left/right regions

import { CANONICAL_CATALOG } from "./muscle-data.js";

const DEFAULT_GREY = "#A7A9A5";

function getColor(muscleColorMap, muscleId) {
  if (!muscleColorMap) return DEFAULT_GREY;
  if (typeof muscleColorMap[muscleId] === "string") return muscleColorMap[muscleId];
  if (muscleColorMap[muscleId] && typeof muscleColorMap[muscleId].color === "string") {
    return muscleColorMap[muscleId].color;
  }
  return DEFAULT_GREY;
}

function getAria(muscleColorMap, muscleId) {
  const meta = CANONICAL_CATALOG.find((c) => c.id === muscleId);
  const name = meta ? meta.name : muscleId;
  if (muscleColorMap && muscleColorMap[muscleId] && typeof muscleColorMap[muscleId].sets === "number") {
    const sets = muscleColorMap[muscleId].sets;
    const label = muscleColorMap[muscleId].label || (sets > 0 ? `${sets} sets` : "No training");
    return `${name}: ${label} (${sets} set${sets === 1 ? "" : "s"})`;
  }
  return name;
}

const FRONT_PATHS = {
  "chest": [
    "M 228,204 L 134,242 L 137,247 L 134,249 L 140,252 L 141,258 L 161,285 L 179,295 L 193,297 L 212,295 L 231,285 L 237,270 L 237,245 Z",
    "M 258,204 L 249,248 L 249,268 L 255,284 L 275,295 L 301,297 L 329,283 L 347,255 L 351,243 L 310,223 Z",
    "M 227,201 L 216,195 L 187,191 L 175,196 L 148,219 L 107,267 L 126,250 L 135,247 L 132,242 L 176,221 L 226,204 Z",
    "M 260,199 L 261,204 L 305,219 L 349,239 L 353,243 L 352,247 L 366,254 L 335,216 L 305,192 L 274,194 Z"
  ],
  "anterior_deltoids": [
    "M 181,192 L 152,183 L 133,184 L 113,192 L 112,196 L 116,203 L 112,205 L 116,214 L 128,227 L 137,231 L 158,207 Z",
    "M 307,192 L 329,208 L 361,246 L 368,234 L 376,235 L 367,222 L 389,212 L 373,192 L 357,185 L 338,183 Z"
  ],
  "lateral_deltoids": [
    "M 111,195 L 96,211 L 87,247 L 94,289 L 82,341 L 87,361 L 94,368 L 99,365 L 99,339 L 120,257 L 107,269 L 105,266 L 136,233 L 129,230 L 114,214 L 110,205 L 114,203 Z",
    "M 390,213 L 379,220 L 369,222 L 378,235 L 368,236 L 362,248 L 383,269 L 395,290 L 398,284 L 395,272 L 399,245 Z"
  ],
  "biceps": [
    "M 133,250 L 126,252 L 120,263 L 101,339 L 101,365 L 124,340 L 138,303 L 141,264 L 138,252 Z",
    "M 351,249 L 346,259 L 346,283 L 355,324 L 363,341 L 374,353 L 372,356 L 376,375 L 390,370 L 398,380 L 397,366 L 405,347 L 405,337 L 394,291 L 388,278 L 376,264 L 357,250 Z"
  ],
  "forearms": [
    "M 76,311 L 72,330 L 57,365 L 58,412 L 62,409 L 80,424 L 64,467 L 65,475 L 80,449 L 85,447 L 99,421 L 85,400 L 89,380 L 78,347 Z",
    "M 99,370 L 90,381 L 87,400 L 94,407 L 96,415 L 102,419 L 110,410 L 106,401 L 110,381 Z",
    "M 53,378 L 50,405 L 57,485 L 78,424 L 62,411 L 58,414 L 56,412 Z",
    "M 411,300 L 410,342 L 399,366 L 398,382 L 404,408 L 415,435 L 423,427 L 428,428 L 431,376 L 427,357 L 414,328 Z",
    "M 389,372 L 377,380 L 382,405 L 393,429 L 429,485 L 414,436 L 402,408 L 397,383 Z",
    "M 433,376 L 430,428 L 423,429 L 415,437 L 431,484 L 434,479 L 434,425 L 437,404 Z"
  ],
  "abs": [
    "M 238,290 L 229,288 L 201,301 L 197,310 L 200,335 L 206,336 L 219,327 L 236,322 L 241,309 Z",
    "M 249,289 L 245,305 L 250,320 L 272,328 L 278,333 L 288,334 L 291,314 L 286,297 L 275,297 L 258,288 Z",
    "M 234,324 L 219,329 L 201,340 L 197,351 L 198,364 L 205,366 L 234,362 L 238,359 L 241,338 Z",
    "M 249,330 L 247,355 L 251,361 L 286,365 L 290,362 L 290,347 L 281,335 L 260,326 Z",
    "M 234,364 L 201,368 L 196,377 L 198,398 L 212,402 L 236,400 L 240,394 L 241,376 Z",
    "M 253,362 L 247,376 L 248,395 L 252,400 L 267,403 L 290,397 L 291,376 L 285,366 Z"
  ],
  "obliques": [
    "M 163,365 L 161,369 L 165,385 L 160,401 L 160,421 L 164,434 L 170,441 L 187,447 L 193,438 L 193,423 L 184,407 L 187,393 L 174,382 Z",
    "M 162,443 L 140,545 L 159,516 L 170,484 L 168,448 Z",
    "M 326,386 L 302,408 L 296,419 L 295,438 L 301,447 L 314,443 L 325,432 L 328,417 Z",
    "M 326,443 L 319,452 L 320,484 L 330,510 L 351,544 L 339,492 L 340,480 L 335,472 L 329,445 Z"
  ],
  "quadriceps": [
    "M 169,449 L 176,490 L 192,548 L 176,556 L 178,567 L 194,564 L 198,569 L 204,592 L 208,589 L 216,590 L 218,586 L 184,462 Z",
    "M 172,469 L 172,484 L 161,516 L 158,518 L 148,573 L 149,623 L 164,672 L 179,671 L 180,657 L 198,591 L 195,567 L 180,570 L 176,567 L 174,556 L 190,548 L 174,490 Z",
    "M 185,464 L 220,586 L 216,592 L 205,593 L 218,641 L 221,664 L 219,682 L 211,703 L 202,747 L 206,745 L 205,739 L 217,706 L 222,673 L 222,645 L 226,642 L 225,609 L 230,587 L 230,533 L 215,515 L 211,500 Z",
    "M 319,449 L 308,458 L 276,573 L 279,577 L 294,579 L 296,599 L 302,592 L 297,586 L 301,580 L 301,573 L 306,569 L 317,569 L 317,552 L 312,549 L 319,543 L 326,543 L 330,533 L 335,530 L 332,516 L 318,484 Z",
    "M 336,531 L 332,533 L 326,545 L 319,545 L 314,549 L 319,552 L 319,569 L 303,573 L 303,580 L 299,586 L 304,592 L 296,601 L 314,671 L 329,672 L 343,621 L 343,567 Z",
    "M 276,577 L 269,617 L 272,690 L 293,752 L 274,676 L 282,676 L 284,673 L 289,676 L 288,669 L 295,665 L 290,658 L 295,655 L 298,657 L 299,652 L 306,653 L 308,649 L 294,603 L 292,579 L 290,581 Z"
  ],
  "calves": [
    "M 178,672 L 164,674 L 162,692 L 155,705 L 148,689 L 151,721 L 143,783 L 148,825 L 170,903 L 175,897 L 171,869 L 177,866 L 185,873 L 183,797 L 189,777 L 201,756 L 202,749 L 199,745 L 210,707 L 195,712 L 185,705 L 180,695 Z",
    "M 202,759 L 191,777 L 185,797 L 187,815 L 199,841 L 204,830 L 208,806 Z",
    "M 282,703 L 295,746 L 294,756 L 306,777 L 312,796 L 312,853 L 325,865 L 321,894 L 326,902 L 352,801 L 351,775 L 343,734 L 343,699 L 339,706 L 336,702 L 323,702 L 318,712 L 308,707 L 301,711 L 292,711 Z",
    "M 294,759 L 289,781 L 288,810 L 295,841 L 299,842 L 298,849 L 307,891 L 311,854 L 311,804 L 306,782 Z"
  ]
};

const BACK_PATHS = {
  "traps": [
    "M 245,121 L 241,144 L 227,179 L 247,215 L 251,236 L 255,214 L 271,188 L 274,176 L 261,147 L 258,124 Z",
    "M 240,114 L 234,116 L 226,135 L 210,156 L 165,178 L 160,185 L 168,194 L 201,208 L 207,215 L 207,223 L 212,223 L 222,233 L 225,230 L 237,231 L 248,226 L 245,215 L 225,179 L 241,136 L 243,121 Z",
    "M 261,113 L 261,139 L 276,181 L 257,214 L 252,239 L 273,254 L 287,253 L 291,249 L 299,254 L 301,240 L 294,224 L 295,214 L 302,207 L 335,192 L 340,182 L 290,155 L 280,142 L 267,116 Z",
    "M 206,225 L 199,243 L 196,274 L 192,283 L 209,279 L 243,341 L 255,337 L 259,341 L 287,291 L 298,255 L 291,251 L 287,255 L 273,256 L 250,239 L 248,228 L 237,233 L 225,232 L 222,235 L 212,225 Z"
  ],
  "posterior_deltoids": [
    "M 157,183 L 149,187 L 147,198 L 124,205 L 109,220 L 122,233 L 131,232 L 133,229 L 137,234 L 129,236 L 136,244 L 154,236 L 177,273 L 191,282 L 197,243 L 203,232 L 205,215 L 198,208 L 185,205 L 168,196 Z",
    "M 320,213 L 352,239 L 363,234 L 368,228 L 381,225 L 388,214 L 372,202 L 361,198 L 346,200 Z"
  ],
  "lateral_deltoids": [
    "M 135,233 L 133,231 L 131,234 L 122,235 L 107,221 L 96,239 L 94,264 L 112,251 L 133,245 L 133,240 L 127,236 Z",
    "M 389,215 L 381,227 L 368,230 L 355,240 L 379,249 L 403,308 L 417,326 L 423,370 L 425,341 L 420,310 L 408,272 L 398,261 L 401,259 L 408,266 L 406,241 Z"
  ],
  "triceps": [
    "M 133,247 L 117,251 L 102,259 L 103,262 L 96,268 L 82,302 L 77,333 L 78,390 L 82,333 L 90,317 L 99,308 L 110,280 L 118,280 L 123,285 L 129,282 L 132,287 L 125,291 L 126,296 L 141,301 L 143,305 L 142,278 Z",
    "M 129,284 L 123,287 L 112,280 L 101,308 L 86,327 L 79,391 L 83,397 L 88,397 L 98,385 L 98,370 L 104,351 L 121,342 L 126,336 L 133,339 L 139,325 L 141,303 L 129,300 L 123,292 L 130,287 Z",
    "M 377,249 L 371,248 L 366,252 L 360,276 L 335,285 L 336,298 L 341,300 L 338,303 L 348,307 L 346,314 L 354,312 L 357,307 L 360,308 L 370,297 L 371,292 L 384,284 L 381,280 L 388,277 Z",
    "M 389,278 L 383,280 L 386,284 L 373,292 L 372,297 L 359,309 L 370,339 L 375,339 L 381,332 L 390,331 L 392,310 L 395,306 L 401,307 Z"
  ],
  "lats": [
    "M 134,246 L 139,254 L 141,274 L 144,278 L 145,305 L 158,344 L 166,347 L 173,343 L 179,347 L 176,344 L 184,336 L 187,339 L 185,343 L 193,348 L 200,348 L 205,343 L 238,343 L 241,348 L 242,342 L 215,297 L 209,281 L 193,285 L 184,281 L 175,273 L 154,238 Z",
    "M 238,345 L 205,345 L 200,350 L 193,350 L 183,343 L 183,338 L 178,344 L 181,347 L 179,349 L 173,345 L 166,349 L 159,346 L 173,383 L 185,405 L 173,425 L 172,437 L 195,435 L 199,403 L 213,383 L 236,359 L 240,352 Z",
    "M 370,247 L 352,241 L 321,215 L 313,218 L 302,241 L 293,281 L 262,337 L 267,344 L 296,344 L 306,336 L 312,338 L 319,334 L 337,335 L 339,332 L 347,335 L 354,314 L 346,316 L 346,307 L 336,303 L 339,300 L 334,298 L 333,285 L 360,274 L 364,252 Z",
    "M 261,339 L 260,348 L 264,357 L 299,396 L 307,430 L 346,336 L 339,334 L 337,337 L 319,336 L 312,340 L 306,338 L 296,346 L 267,346 Z"
  ],
  "lower_back": [
    "M 255,339 L 244,342 L 238,359 L 204,397 L 200,413 L 207,419 L 225,418 L 232,425 L 243,425 L 243,420 L 239,416 L 245,410 L 252,413 L 254,425 L 261,417 L 267,416 L 257,412 L 259,408 L 264,407 L 259,405 L 256,399 L 263,388 L 260,384 L 263,377 L 260,375 L 273,369 L 262,357 Z",
    "M 250,413 L 242,414 L 245,420 L 243,427 L 232,427 L 225,420 L 207,421 L 199,414 L 195,437 L 173,438 L 168,444 L 146,544 L 139,599 L 141,652 L 151,698 L 145,606 L 148,570 L 154,548 L 158,548 L 164,563 L 165,600 L 173,581 L 183,571 L 195,566 L 186,559 L 188,555 L 175,543 L 167,524 L 162,490 L 165,458 L 177,443 L 191,441 L 210,447 L 228,462 L 234,460 L 238,451 L 246,446 L 250,447 Z",
    "M 274,370 L 269,375 L 262,375 L 265,377 L 262,383 L 265,388 L 258,402 L 266,407 L 259,412 L 269,416 L 252,426 L 252,447 L 238,453 L 236,460 L 229,464 L 245,487 L 251,503 L 267,471 L 290,448 L 304,442 L 319,441 L 327,444 L 334,452 L 340,470 L 335,520 L 329,538 L 315,553 L 318,557 L 305,564 L 320,571 L 330,581 L 338,602 L 339,566 L 344,550 L 349,550 L 357,598 L 353,694 L 361,661 L 364,597 L 358,549 L 335,447 L 329,439 L 306,434 L 300,402 Z"
  ],
  "forearms": [
    "M 119,362 L 105,375 L 99,376 L 100,385 L 94,393 L 95,396 L 74,442 L 74,451 L 88,452 L 103,432 L 114,400 L 118,371 L 114,375 L 111,373 Z",
    "M 93,448 L 88,454 L 74,453 L 71,450 L 63,476 L 66,481 L 63,494 L 67,493 L 77,468 L 95,450 Z",
    "M 382,363 L 381,370 L 385,375 L 389,402 L 402,436 L 408,430 L 412,430 L 416,435 L 415,429 L 421,425 L 408,397 L 409,394 L 402,385 L 402,379 Z",
    "M 408,432 L 403,438 L 413,451 L 414,462 L 421,469 L 432,496 L 434,489 L 438,495 L 444,493 L 422,427 L 417,429 L 419,434 L 416,437 L 412,432 Z"
  ],
  "glutes": [
    "M 166,502 L 177,485 L 191,472 L 198,478 L 213,480 L 221,489 L 225,489 L 238,479 L 227,463 L 210,449 L 197,444 L 180,444 L 171,450 L 164,469 Z",
    "M 191,474 L 179,485 L 167,503 L 167,515 L 173,536 L 180,547 L 190,555 L 188,559 L 196,565 L 204,566 L 234,556 L 247,546 L 250,504 L 239,481 L 221,491 L 213,482 L 198,480 Z",
    "M 272,467 L 272,472 L 277,472 L 277,476 L 284,480 L 290,476 L 295,479 L 306,468 L 330,491 L 334,497 L 335,509 L 338,470 L 335,458 L 327,446 L 319,443 L 298,446 L 282,456 Z",
    "M 306,470 L 295,481 L 290,478 L 285,482 L 277,478 L 277,474 L 269,471 L 252,504 L 254,544 L 263,555 L 283,563 L 301,565 L 315,558 L 313,553 L 327,538 L 333,520 L 332,497 L 320,481 Z"
  ],
  "hamstrings": [
    "M 200,567 L 183,573 L 173,584 L 165,602 L 164,609 L 181,622 L 182,637 L 186,639 L 189,598 L 197,569 Z",
    "M 211,565 L 199,569 L 191,598 L 187,640 L 188,655 L 210,627 L 214,627 L 207,696 L 211,744 L 219,690 L 214,614 L 215,585 Z",
    "M 164,611 L 159,639 L 153,740 L 173,705 L 185,655 L 186,641 L 180,637 L 179,622 Z",
    "M 302,566 L 308,577 L 314,608 L 330,606 L 331,612 L 338,613 L 335,595 L 328,581 L 317,571 Z",
    "M 260,553 L 258,574 L 261,606 L 279,671 L 279,692 L 287,732 L 289,728 L 291,730 L 293,744 L 296,695 L 288,629 L 290,627 L 315,657 L 312,602 L 306,577 L 300,566 L 283,565 L 263,557 Z",
    "M 315,609 L 317,657 L 329,703 L 350,739 L 340,613 L 331,614 L 330,608 Z"
  ],
  "calves": [
    "M 163,731 L 154,741 L 138,801 L 138,828 L 148,852 L 157,856 L 165,854 L 172,842 L 176,815 L 172,756 Z",
    "M 197,736 L 189,742 L 184,755 L 177,814 L 184,816 L 187,813 L 198,824 L 203,824 L 211,816 L 210,799 Z",
    "M 178,815 L 176,832 L 179,845 L 186,857 L 200,861 L 207,847 L 211,818 L 203,826 L 198,826 L 187,815 L 184,818 Z",
    "M 342,729 L 335,737 L 331,752 L 328,831 L 335,849 L 343,855 L 351,855 L 356,852 L 361,842 L 365,805 L 358,767 Z",
    "M 308,736 L 299,756 L 299,773 L 294,780 L 296,790 L 293,820 L 304,823 L 307,827 L 301,829 L 309,833 L 319,829 L 326,831 L 326,798 L 319,754 L 313,740 Z",
    "M 293,822 L 294,838 L 300,857 L 305,861 L 315,859 L 323,849 L 327,832 L 319,831 L 308,835 L 299,829 L 305,827 L 304,825 Z"
  ]
};

/**
 * Render Front / Anterior SVG View
 * Canonical muscles visible:
 * chest, anterior_deltoids, lateral_deltoids, biceps, forearms, abs, obliques, quadriceps, calves
 */
export function renderAnteriorSvg(muscleColorMap = {}, options = {}) {
  const selectedMuscle = options.selectedMuscle || null;

  const groupsOrder = [
    "chest",
    "anterior_deltoids",
    "lateral_deltoids",
    "biceps",
    "forearms",
    "abs",
    "obliques",
    "quadriceps",
    "calves"
  ];

  const muscleGroupsHtml = groupsOrder.map((id) => {
    const c = getColor(muscleColorMap, id);
    const isSelected = selectedMuscle === id;
    const isTrained = c !== DEFAULT_GREY;
    const opacity = isTrained ? "0.62" : "0.08";
    const fill = isTrained ? c : "#6e7b73";
    const paths = (FRONT_PATHS[id] || []).map((d) => {
      return `<path class="muscle-path" d="${d}" fill="${fill}" fill-opacity="${opacity}" />`;
    }).join("\n      ");

    const cls = isSelected
      ? (isTrained ? "muscle-group is-selected is-trained" : "muscle-group is-selected")
      : (isTrained ? "muscle-group is-trained" : "muscle-group ");

    return `<g class="${cls}" data-muscle="${id}" tabindex="0" role="button" aria-label="${getAria(muscleColorMap, id)}">
      ${paths}
    </g>`;
  }).join("\n\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 500 1024" class="anatomy-svg anterior-view" role="img" aria-label="Anterior Muscle Heatmap">
    <defs>
      <filter id="muscle-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- Underlying Realistic Anatomical Reference Base Illustration -->
    <image href="/assets/anatomy/front.png" xlink:href="/assets/anatomy/front.png" x="0" y="0" width="500" height="1024" preserveAspectRatio="none" />

    <!-- Interactive Traced Vector Muscle Overlay -->
    ${muscleGroupsHtml}
  </svg>`;
}

/**
 * Render Back / Posterior SVG View
 * Canonical muscles visible:
 * traps, posterior_deltoids, lateral_deltoids, lats, triceps, lower_back, glutes, hamstrings, calves, forearms
 */
export function renderPosteriorSvg(muscleColorMap = {}, options = {}) {
  const selectedMuscle = options.selectedMuscle || null;

  const groupsOrder = [
    "traps",
    "posterior_deltoids",
    "lateral_deltoids",
    "triceps",
    "lats",
    "lower_back",
    "forearms",
    "glutes",
    "hamstrings",
    "calves"
  ];

  const muscleGroupsHtml = groupsOrder.map((id) => {
    const c = getColor(muscleColorMap, id);
    const isSelected = selectedMuscle === id;
    const isTrained = c !== DEFAULT_GREY;
    const opacity = isTrained ? "0.62" : "0.08";
    const fill = isTrained ? c : "#6e7b73";
    const paths = (BACK_PATHS[id] || []).map((d) => {
      return `<path class="muscle-path" d="${d}" fill="${fill}" fill-opacity="${opacity}" />`;
    }).join("\n      ");

    const cls = isSelected
      ? (isTrained ? "muscle-group is-selected is-trained" : "muscle-group is-selected")
      : (isTrained ? "muscle-group is-trained" : "muscle-group ");

    return `<g class="${cls}" data-muscle="${id}" tabindex="0" role="button" aria-label="${getAria(muscleColorMap, id)}">
      ${paths}
    </g>`;
  }).join("\n\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 500 1024" class="anatomy-svg posterior-view" role="img" aria-label="Posterior Muscle Heatmap">
    <defs>
      <filter id="muscle-glow-p" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- Underlying Realistic Anatomical Reference Base Illustration (Offset by +14 to center perfectly at x=250) -->
    <image href="/assets/anatomy/back.png" xlink:href="/assets/anatomy/back.png" x="14" y="0" width="472" height="1024" preserveAspectRatio="none" />

    <!-- Interactive Traced Vector Muscle Overlay -->
    ${muscleGroupsHtml}
  </svg>`;
}
