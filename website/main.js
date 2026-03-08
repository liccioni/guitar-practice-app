const yearEl = document.getElementById("year");
const waitlistForm = document.getElementById("waitlist-form");
const waitlistMessage = document.getElementById("waitlist-message");
const emailInput = document.getElementById("email");

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

if (waitlistForm && waitlistMessage && emailInput) {
  waitlistForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = String(emailInput.value || "").trim();
    if (!email) {
      waitlistMessage.textContent = "Enter an email first.";
      return;
    }
    const mailto = `mailto:liccioni+guitarapp@gmail.com?subject=${encodeURIComponent(
      "Guitar Practice App Waitlist",
    )}&body=${encodeURIComponent(`Add me to the waitlist: ${email}`)}`;
    waitlistMessage.textContent = `Thanks, ${email}. Opening your email client to confirm waitlist signup.`;
    window.location.href = mailto;
    waitlistForm.reset();
  });
}
