import Svg, { Rect } from 'react-native-svg';

export const DeviceActivationQr = ({
    modules,
    width,
    size = 224,
    accessibilityLabel,
}: {
    modules: boolean[];
    width: number;
    size?: number;
    accessibilityLabel: string;
}) => {
    if (!Number.isSafeInteger(width) || width <= 0 || modules.length !== width * width) {
        return null;
    }
    const quietZone = 4;
    const viewBoxSize = width + quietZone * 2;

    return (
        <Svg
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="image"
            width={size}
            height={size}
            viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        >
            <Rect width={viewBoxSize} height={viewBoxSize} fill="#ffffff" />
            {modules.map((dark, index) =>
                dark ? (
                    <Rect
                        key={index}
                        x={(index % width) + quietZone}
                        y={Math.floor(index / width) + quietZone}
                        width={1}
                        height={1}
                        fill="#000000"
                    />
                ) : null,
            )}
        </Svg>
    );
};
