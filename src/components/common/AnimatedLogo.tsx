import { useId } from 'react';
import './AnimatedLogo.css';

export type AnimatedLogoState = 'idle' | 'loading' | 'success' | 'error';

const VALID_STATES: readonly AnimatedLogoState[] = ['idle', 'loading', 'success', 'error'] as const;

export interface AnimatedLogoProps {
  state?: AnimatedLogoState;
  size?: number | string;
  className?: string;
  title?: string;
  showBackground?: boolean;
}

export default function AnimatedLogo({
  state = 'idle',
  size = 100,
  className = '',
  title = 'App Logo',
  showBackground = true,
}: AnimatedLogoProps) {
  const animationState: AnimatedLogoState = VALID_STATES.includes(state as AnimatedLogoState)
    ? (state as AnimatedLogoState)
    : 'idle';

  const rawId = useId();
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const clipPathId = `animated-logo-clip-${safeId}`;

  const dimension = typeof size === 'number' ? `${size}px` : size;

  return (
    <div
      className={`animated-logo animated-logo--${animationState} ${className}`}
      style={{
        width: dimension,
        height: dimension,
      }}
      role="img"
      aria-label={title}
    >
      <svg
        viewBox="0 0 300 300"
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g key={animationState} className="animated-logo__container">
          {/* Background */}
          {showBackground && (
            <rect
              className="animated-logo__background"
              width="300"
              height="300"
              rx="68"
              fill="#F5F5F5"
            />
          )}

          <g clipPath={showBackground ? `url(#${clipPathId})` : undefined}>
            {showBackground && (
              <>
                {/* Inner background shadow / depth */}
                <rect
                  x="7"
                  y="7"
                  width="286"
                  height="286"
                  rx="68"
                  fill="#414141"
                />

                <rect
                  x="7"
                  y="7"
                  width="286"
                  height="286"
                  rx="68"
                  fill="#D9D9D9"
                />
              </>
            )}

            {/* Face */}
            <g className="animated-logo__face">
              <path
                d="M82 87.9934C39 115.994 3 137.994 3 137.994C5.57082 137.997 -4.00001 236.994 19.5 275.494C43 313.994 265.5 288.494 265.5 288.494C265.5 288.494 255.5 252.994 259.913 209.494C259.913 154.994 236.415 112.999 200 92.9935C170.918 77.0168 135.5 64.4939 82 87.9934Z"
                fill="black"
                stroke="black"
              />

              {/* Left eye */}
              <g className="animated-logo__eye animated-logo__eye--left">
                <path
                  d="M109.128 130.174C109.057 129.071 109.894 128.12 110.996 128.05L117.029 127.663C131.359 126.744 143.721 137.616 144.639 151.946L145.764 169.483C145.834 170.585 144.998 171.536 143.896 171.607L113.912 173.529C112.809 173.6 111.858 172.763 111.788 171.661L109.128 130.174Z"
                  fill="white"
                />

                <path
                  d="M129.429 148.005C129.782 147.975 130.044 147.664 130.014 147.311C129.623 142.721 125.585 139.317 120.995 139.708L109 140.73L109.762 149.68L129.429 148.005Z"
                  fill="black"
                />
              </g>

              {/* Right eye */}
              <g className="animated-logo__eye animated-logo__eye--right">
                <path
                  d="M163.128 127.174C163.057 126.071 163.894 125.12 164.996 125.05L171.029 124.663C185.359 123.744 197.721 134.616 198.639 148.946L199.764 166.483C199.834 167.585 198.998 168.536 197.896 168.607L167.912 170.529C166.809 170.6 165.858 169.763 165.788 168.661L163.128 127.174Z"
                  fill="white"
                />

                <path
                  d="M183.429 145.005C183.782 144.975 184.044 144.664 184.014 144.311C183.623 139.721 179.585 136.317 174.995 136.708L163 137.73L163.762 146.68L183.429 145.005Z"
                  fill="black"
                />
              </g>
            </g>
          </g>
        </g>

        {showBackground && (
          <defs>
            <clipPath id={clipPathId}>
              <rect
                x="7"
                y="7"
                width="286"
                height="286"
                rx="68"
                fill="white"
              />
            </clipPath>
          </defs>
        )}
      </svg>
    </div>
  );
}
