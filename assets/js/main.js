document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const menuButton = document.getElementById('menu-button');
    let backdrop = null;

    if (menuButton && sidebar) {
        menuButton.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent the click from bubbling up
            
            // Toggle sidebar visibility by changing its position
            sidebar.classList.toggle('-translate-x-full');

            // If the sidebar is now open (i.e., it doesn't have the '-translate-x-full' class)
            if (!sidebar.classList.contains('-translate-x-full')) {
                // Create a backdrop if it doesn't exist
                if (!backdrop) {
                    backdrop = document.createElement('div');
                    backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden';
                    document.body.appendChild(backdrop);

                    // Add event listener to the backdrop to close the sidebar when clicked
                    backdrop.addEventListener('click', function() {
                        sidebar.classList.add('-translate-x-full');
                        this.remove();
                        backdrop = null;
                    });
                }
            } else {
                // If the sidebar is closed, remove the backdrop if it exists
                if (backdrop) {
                    backdrop.remove();
                    backdrop = null;
                }
            }
        });
    }
});