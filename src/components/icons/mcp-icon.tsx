import Svg, { G, Path, type SvgProps } from 'react-native-svg';

export type McpIconProps = SvgProps & {
    size?: number;
    color?: string;
    strokeWidth?: number;
};

export const McpIcon = ({
    size = 20,
    color = '#000',
    strokeWidth = 1.5,
    ...props
}: McpIconProps) => {
    return (
        <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" {...props}>
            <G
                transform="translate(-2 -2)"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <Path d="M3.49994,11.7501 L11.6717,3.57855 C12.7762,2.47398 14.5672,2.47398 15.6717,3.57855 C16.7762,4.68312 16.7762,6.47398 15.6717,7.57855 M15.6717,7.57855 L9.49994,13.7501 M15.6717,7.57855 C16.7762,6.47398 18.5672,6.47398 19.6717,7.57855 C20.7762,8.68312 20.7762,10.474 19.6717,11.5785 L12.7072,18.543 C12.3167,18.9335 12.3167,19.5667 12.7072,19.9572 L13.9999,21.2499" />
                <Path d="M17.4999,9.74921 L11.3282,15.921 C10.2237,17.0255 8.43272,17.0255 7.32823,15.921 C6.22373,14.8164 6.22373,13.0255 7.32823,11.921 L13.4999,5.74939" />
            </G>
        </Svg>
    );
};
