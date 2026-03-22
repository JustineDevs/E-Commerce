# Get Started with PayPal REST APIs

**Source:** https://developer.paypal.com/api/rest/
**Saved:** 2026-03-22T07:57:58.249Z

*Generated with [markdown-printer](https://github.com/levz0r/markdown-printer) (v1.1.1) by [Lev Gelfenbuim](https://lev.engineer)*

---

# [](#link-getstartedwithpaypalrestapis)Get started with PayPal REST APIs

PayPal APIs use REST, authenticate with OAuth 2.0 access tokens, and return HTTP response codes and responses encoded in JSON. You can test US integrations with a PayPal Developer account.

You can try our REST APIs in Postman without a PayPal Developer account. Learn more in our [Postman guide](/api/rest/postman).

Explore our REST API descriptions, generate code for your API clients, and import OpenAPI documents into compatible [third-party tools](https://tools.openapis.org/).

Important: You’ll need a [PayPal Business account](https://www.paypal.com/business/open-business-account) to do the following:

-   Go live with integrations.
-   Test integrations outside the US.

## [](#link-getclientidandclientsecret)1\. Get client ID and client secret

PayPal integrations use a client ID and client secret to authenticate API calls:

-   A client ID identifies an app. You only need a client ID to get a PayPal payment button and standard credit and debit card fields.
-   A client secret authenticates a client ID. To call PayPal APIs, you'll exchange your client ID and client secret for an access token. Keep this secret safe.

Here's how to get your client ID and client secret:

1.  Select [Log in to Dashboard](/dashboard/) and log in or sign up.
2.  Select Apps & Credentials.
3.  New accounts come with a Default Application in the REST API apps section. To create a new project, select Create App.
4.  Copy the client ID and client secret for your app.

## [](#link-getaccesstoken)2\. Get access token

Exchange your client ID and client secret for an access token. The access token authenticates your app when calling PayPal REST APIs. You can call the PayPal OAuth API in any language. The following examples show you how to get your access token using cURL or Postman:

### [](#link-curl)cURL

1curl -v -X POST "https://api-m.sandbox.paypal.com/v1/oauth2/token" \\

2 -u "CLIENT\_ID:CLIENT\_SECRET" \\

3 -H "Content-Type: application/x-www-form-urlencoded" \\

4 -d "grant\_type=client\_credentials"

#### [](#link-modifythecode)Modify the code

1.  Change `CLIENT_ID` to your client ID.
2.  Change `CLIENT_SECRET` to your client secret.

> Note: Encode `CLIENT_ID:CLIENT_SECRET` in Base64 before sending it in the API call.

### [](#link-sampleresponse)Sample response

PayPal returns an access token and the number of seconds the access token is valid.

1{

2  "scope": "https://uri.paypal.com/services/invoicing https://uri.paypal.com/services/disputes/read-buyer https://uri.paypal.com/services/payments/realtimepayment https://uri.paypal.com/services/disputes/update-seller https://uri.paypal.com/services/payments/payment/authcapture openid https://uri.paypal.com/services/disputes/read-seller https://uri.paypal.com/services/payments/refund https://api-m.paypal.com/v1/vault/credit-card https://api-m.paypal.com/v1/payments/.\* https://uri.paypal.com/payments/payouts https://api-m.paypal.com/v1/vault/credit-card/.\* https://uri.paypal.com/services/subscriptions https://uri.paypal.com/services/applications/webhooks",

3  "access\_token": "A21AAFEpH4PsADK7qSS7pSRsgzfENtu-Q1ysgEDVDESseMHBYXVJYE8ovjj68elIDy8nF26AwPhfXTIeWAZHSLIsQkSYz9ifg",

4  "token\_type": "Bearer",

5  "app\_id": "APP-80W284485P519543T",

6  "expires\_in": 31668,

7  "nonce": "2020-04-03T15:35:36ZaYZlGvEkV4yVSz8g6bAKFoGSEzuy3CQcz3ljhibkOHg"

8}

### [](#link-makeapicalls)Make API calls

When you make API calls, replace `ACCESS-TOKEN` with your access token in the authorization header: `-H Authorization: Bearer ACCESS-TOKEN`. When your access token expires, call `/v1/oauth2/token` again to request a new access token.

## [](#link-getsandboxaccountcredentials)3\. Get sandbox account credentials

The PayPal sandbox is a test environment that mirrors real-world transactions. By default, PayPal developer accounts have 2 sandbox accounts: a personal account for buying and a business account for selling. You'll get the login information for both accounts. Watch sandbox money move between accounts to test API calls.

Take the following steps to get sandbox login information for business and personal accounts:

1.  Log into the [Developer Dashboard](/dashboard/).
2.  Select Testing Tools > Sandbox Accounts. You can create more sandbox accounts by selecting Create account.
3.  Locate the account you want to get credentials for and select ⋮
4.  Select View/Edit Account to see mock information such as the account email and system-generated password.
5.  Go to [sandbox.paypal.com/signin](https://sandbox.paypal.com/signin) and sign in with the personal sandbox credentials. In a separate browser, sign in with the business sandbox credentials.
6.  Make API calls with your app's access token to see sandbox money move between personal and business accounts.

## [](#link-moreinformation)More Information

Optional

[Sandbox Accounts](/tools/sandbox/)

Simulate transactions to test your app.

Optional

[PayPal Partner Program](/docs/multiparty/)

Make calls on behalf of a third party.