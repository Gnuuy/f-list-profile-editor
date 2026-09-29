export default function ImageConverterSidebarView() {
    return (
        <div className="editor-sidebar-actions">
            <p className="image-converter-note">
                Large images are scaled down to fit, and shrunk 10% at a time until they&apos;re under 8 MB.
                Smaller images keep their size unless you tick Enlarge.
            </p>
            <p className="image-converter-note">
                Transparent images stay transparent.
            </p>
        </div>
    );
}
