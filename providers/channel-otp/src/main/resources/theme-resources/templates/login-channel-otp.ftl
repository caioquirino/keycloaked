<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('code') displayInfo=true; section>
    <#if section = "header">
        ${msg("doLogIn")} - Verification Code
    <#elseif section = "form">
        <div style="margin-bottom: 1.25rem;">
            <p style="color: #626773; font-size: 0.925rem; line-height: 1.5; margin-top: 0;">
                <#if isWhatsApp?? && isWhatsApp>
                    We sent a 6-digit verification code to your WhatsApp at <strong style="color: #191420;">${destination}</strong>.
                <#elseif isSms?? && isSms>
                    We sent a 6-digit verification code via SMS to <strong style="color: #191420;">${destination}</strong>.
                <#else>
                    We sent a 6-digit verification code to <strong style="color: #191420;">${destination}</strong>.
                </#if>
            </p>
        </div>

        <form id="kc-channel-otp-login-form" class="${properties.kcFormClass!}" action="${url.loginAction}" method="post">
            <div class="${properties.kcFormGroupClass!}">
                <div class="${properties.kcLabelWrapperClass!}">
                    <label for="code" class="${properties.kcLabelClass!}">6-Digit Code</label>
                </div>
                <div class="${properties.kcInputWrapperClass!}">
                    <input id="code" name="code" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6"
                           class="${properties.kcInputClass!}" autofocus autocomplete="one-time-code"
                           placeholder="123456"
                           style="letter-spacing: 0.25em; font-size: 1.5rem; text-align: center; font-weight: 600; padding: 0.75rem;" />
                </div>
            </div>

            <div class="${properties.kcFormGroupClass!}" style="margin-top: 1.5rem;">
                <input type="hidden" name="action" id="otp-action" value="submit_code" />
                <input class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}"
                       name="login" id="kc-login" type="submit" value="Verify &amp; Continue" />
            </div>

            <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; text-align: center;">
                <#if canSwitch?? && canSwitch>
                    <button type="submit"
                            onclick="document.getElementById('otp-action').value='switch_channel';"
                            style="background: none; border: none; color: #225EE2; font-size: 0.875rem; font-weight: 600; cursor: pointer; text-decoration: underline; padding: 0.25rem;">
                        ${switchLabel!"Try another way"}
                    </button>
                </#if>

                <button type="submit"
                        onclick="document.getElementById('otp-action').value='resend';"
                        style="background: none; border: none; color: #626773; font-size: 0.825rem; cursor: pointer; text-decoration: none; padding: 0.25rem;">
                    Didn't receive the code? <strong>Resend</strong>
                </button>

                <button type="submit"
                        name="tryAnotherWay"
                        value="on"
                        style="background: none; border: none; color: #225EE2; font-size: 0.85rem; font-weight: 600; cursor: pointer; text-decoration: none; padding: 0.25rem;">
                    Can't receive code? Verify another way ➔
                </button>
            </div>
        </form>
    </#if>
</@layout.registrationLayout>
