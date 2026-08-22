import { render, screen } from "../test/render";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import type { User } from "../types";
import EditProfileModal from "./EditProfileModal";

const user: User = {
  id: "me",
  name: "Original Name",
  handle: "@original",
  avatar: "https://example.com/old.jpg",
  color: "#8b5cf6",
  status: "online",
  followers: 10,
};

it("submits edited profile fields", async () => {
  const interaction = userEvent.setup();
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(<EditProfileModal open user={user} onClose={onClose} onSave={onSave} />);

  const name = screen.getByLabelText("Name");
  await interaction.clear(name);
  await interaction.type(name, "Updated Name");
  const handle = screen.getByLabelText(/^Handle/);
  await interaction.clear(handle);
  await interaction.type(handle, "@updated");
  await interaction.click(screen.getByRole("button", { name: /save changes/i }));

  expect(onSave).toHaveBeenCalledWith({
    name: "Updated Name",
    handle: "@updated",
    avatar: "https://example.com/old.jpg",
  });
  expect(onClose).toHaveBeenCalled();
});
