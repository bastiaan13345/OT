export type RegistrationInput = {
  name: string;
  email: string;
  password: string;
  role: "LISTENER" | "CREATOR";
  approved: boolean;
};

export function parseRegistration(formData: FormData): RegistrationInput {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "LISTENER").toUpperCase();

  if (!name || !email || password.length < 8) {
    throw new Error("Name, email, and an 8 character password are required.");
  }
  if (name.length > 100) throw new Error("Display name is too long.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  if (Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("Password must be 72 bytes or fewer.");
  }
  if (role !== "LISTENER" && role !== "CREATOR") {
    throw new Error("Choose a listener or creator account.");
  }

  return {
    name,
    email,
    password,
    role,
    approved: role === "LISTENER",
  };
}
