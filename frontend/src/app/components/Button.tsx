interface ButtonProps {
    title: string;
    onClick?: () => void;

}

export default function Button({
    title, onClick}: ButtonProps
    )
{
    return (
        <div>
            <button 
                type="button" 
                onClick={onClick}  
                style={{
                    background: "linear-gradient(to bottom, #1c4971, #173e63)", // Subtle gradient
                    color: "#fff", // White text
                    padding: "2px 10px", // Padding for size
                    fontSize: "14px", // Font size for readability
                    border: "1px solid #1c1c1c", // Border matching F-list aesthetics
                    cursor: "pointer", // Pointer cursor on hover
                    transition: "background 0.2s ease, transform 0.2s ease", // Smooth hover effects
                }}
                onMouseOver={(e) => {
                    (e.target as HTMLButtonElement).style.background =
                    "linear-gradient(to bottom, #5a5a5a, #3a3a3a)"; // Lighter gradient on hover
                }}
                onMouseOut={(e) => {
                    (e.target as HTMLButtonElement).style.background =
                    "#235A8F"; // Reset background on mouse out
                }}
                onMouseDown={(e) => {
                    (e.target as HTMLButtonElement).style.transform = "scale(0.95)"; // Pressed effect
                }}
                onMouseUp={(e) => {
                    (e.target as HTMLButtonElement).style.transform = "scale(1)"; // Reset transform
            }}>{title}</button>
        </div>
        )
}