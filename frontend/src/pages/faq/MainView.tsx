export default function FaqMainView() {
    return (
        <div>
            <h1>Frequently Asked Questions:</h1>
            <h3>What kind of data do you track?</h3>
            <p>None. I don't want to deal with GDPR, and frankly I have no use for your data. Your profiles are stored locally on your machine.
            The Feedback feature only sends a JSON message to the backend services, no data is tracked outside of when the feedback was made.</p>
                <p></p>
            <p>If you're interested in seeing the source code for this website, go here.</p>
            <h3>Why'd you make this?</h3>
            <p>My own profile's BBcode is too dense and unwieldy. Small changes would lead to cascading errors. Had enough, made an editor and decided to share it.</p>
            <h3>Will you make a mobile version?</h3>
            <p>Absolutely not.</p>
        </div>
    )
}