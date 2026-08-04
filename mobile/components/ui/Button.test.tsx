import { render, fireEvent, screen } from "@testing-library/react-native";
import { Button } from "./Button";

describe("Button", () => {
  it("renders the label and fires onPress", async () => {
    const onPress = jest.fn();
    await render(<Button label="Sign In" onPress={onPress} />);
    fireEvent.press(screen.getByRole("button", { name: "Sign In" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("hides the label behind a spinner while loading", async () => {
    await render(<Button label="Sign In" onPress={() => {}} loading />);
    expect(screen.queryByText("Sign In")).toBeNull();
  });

  it("marks itself disabled (and blocks presses) while loading", async () => {
    const onPress = jest.fn();
    await render(<Button label="Sign In" onPress={onPress} loading />);
    const button = screen.getByRole("button", { name: "Sign In" });
    expect(button.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
