using Microsoft.Extensions.DependencyInjection;

namespace Application.DependencyResolver;

public static class Resolver
{
    public static void RegisterApplicationLayer(IServiceCollection serviceCollection)
    {
        serviceCollection.AddScoped<ITestService, TestService>();
    }
}