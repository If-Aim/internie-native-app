import { Text, TextInput } from "react-native";

const fontFamily = "Pretendard";

const TextRender = Text.render;
Text.render = function (...args) {
    const origin = TextRender.apply(this, args);
    return {
        ...origin,
        props: {
            ...origin.props,
            style: [{ fontFamily }, origin.props.style],
        },
    };
};

const TextInputRender = TextInput.render;
TextInput.render = function (...args) {
    const origin = TextInputRender.apply(this, args);
    return {
        ...origin,
        props: {
            ...origin.props,
            style: [{ fontFamily }, origin.props.style],
        },
    };
};