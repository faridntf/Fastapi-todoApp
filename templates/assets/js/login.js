"use strict";

const aurora = document.getElementById("aurora");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
let animationId = null;

function animateBackground() {
    currentX += (targetX - currentX) * 0.075;
    currentY += (targetY - currentY) * 0.075;
    aurora.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
    animationId = requestAnimationFrame(animateBackground);
}

function configureMotion() {
    if (reducedMotion.matches || document.hidden) {
        if (animationId !== null) cancelAnimationFrame(animationId);
        animationId = null;
        targetX = targetY = currentX = currentY = 0;
        aurora.style.transform = "translate3d(0, 0, 0)";
        return;
    }
    if (animationId === null) animationId = requestAnimationFrame(animateBackground);
}

document.addEventListener("pointermove", (event) => {
    if (reducedMotion.matches || event.pointerType === "touch") return;
    targetX = (event.clientX / window.innerWidth - 0.5) * 250;
    targetY = (event.clientY / window.innerHeight - 0.5) * 190;
}, { passive: true });
document.documentElement.addEventListener("pointerleave", () => { targetX = targetY = 0; });
window.addEventListener("blur", () => { targetX = targetY = 0; });
document.addEventListener("visibilitychange", configureMotion);
reducedMotion.addEventListener("change", configureMotion);
configureMotion();

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const heading = document.getElementById("form-title");
const statusMessage = document.getElementById("form-status");
const password = document.getElementById("register-password");
const confirmation = document.getElementById("register-confirm");
const phone = document.getElementById("register-phone");

function showForm(moveFocus = false) {
    const registering = window.location.hash === "#register";
    loginForm.hidden = registering;
    registerForm.hidden = !registering;
    heading.textContent = registering ? "ساخت حساب جدید" : "ورود به حساب";
    document.getElementById("welcome").textContent = registering ? "به تیک راه خوش آمدی" : "خوش برگشتی!";
    document.title = `${heading.textContent} | تیک راه`;
    statusMessage.hidden = true;
    document.querySelectorAll(".password-toggle").forEach((button) => {
        document.getElementById(button.getAttribute("aria-controls")).type = "password";
        button.setAttribute("aria-pressed", "false");
        button.setAttribute("aria-label", "نمایش رمز عبور");
    });
    if (moveFocus) heading.focus();
}

document.querySelectorAll(".password-toggle").forEach((button) => {
    button.addEventListener("click", () => {
        const input = document.getElementById(button.getAttribute("aria-controls"));
        const visible = input.type === "password";
        input.type = visible ? "text" : "password";
        button.setAttribute("aria-pressed", String(visible));
        button.setAttribute("aria-label", visible ? "پنهان کردن رمز عبور" : "نمایش رمز عبور");
    });
});

function validateConfirmation() {
    confirmation.setCustomValidity(confirmation.value && confirmation.value !== password.value
        ? "تکرار رمز عبور با رمز عبور یکسان نیست." : "");
}
password.addEventListener("input", validateConfirmation);
confirmation.addEventListener("input", validateConfirmation);
phone.addEventListener("input", () => {
    phone.value = phone.value.replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
        .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit));
});

[loginForm, registerForm].forEach((form) => {
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        statusMessage.textContent = "این فرم فعلاً نمایشی است؛ اطلاعاتی ارسال یا ذخیره نمی‌شود.";
        statusMessage.hidden = false;
    });
    form.addEventListener("input", () => { statusMessage.hidden = true; });
});

window.addEventListener("hashchange", () => showForm(true));
showForm();
